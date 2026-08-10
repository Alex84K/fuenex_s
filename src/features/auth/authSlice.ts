import type { PayloadAction } from "@reduxjs/toolkit"
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import type { AuthResponse, User } from "../../utils/api"
import {
  ApiError,
  apiFetch,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../../utils/api"

export type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialChecked: boolean
  error: string | null
  successMessage: string | null
}

const initialAccessToken = getAccessToken()
const initialRefreshToken = getRefreshToken()

const initialState: AuthState = {
  user: null,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: Boolean(initialAccessToken),
  isLoading: false,
  isInitialChecked: false,
  error: null,
  successMessage: null,
}

export const registerAsync = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>("auth/register", async (credentials, { rejectWithValue }) => {
  try {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
    setTokens(data.accessToken, data.refreshToken)
    return data
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to register. Please try again.")
  }
})

export const loginAsync = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
    setTokens(data.accessToken, data.refreshToken)
    return data
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to log in. Please check your credentials.")
  }
})

export const fetchMeAsync = createAsyncThunk<User, undefined, { rejectValue: string }>(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiFetch<User>("/api/v1/me", { method: "GET" })
      return data
    } catch (err: unknown) {
      clearTokens()
      if (err instanceof ApiError) {
        return rejectWithValue(err.message)
      }
      return rejectWithValue("Session expired. Please log in again.")
    }
  },
)

export const logoutAsync = createAsyncThunk<undefined, undefined, { rejectValue: string }>(
  "auth/logout",
  async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await apiFetch("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch {
      // Ignore network or logout errors, clear client state regardless
    } finally {
      clearTokens()
    }
    return undefined
  },
)

export const logoutAllAsync = createAsyncThunk<undefined, undefined, { rejectValue: string }>(
  "auth/logoutAll",
  async () => {
    try {
      await apiFetch("/api/v1/auth/logout-all", { method: "POST" })
    } catch {
      // Ignore network errors, clear client tokens anyway
    } finally {
      clearTokens()
    }
    return undefined
  },
)

export const forgotPasswordAsync = createAsyncThunk<
  string,
  { email: string },
  { rejectValue: string }
>("auth/forgotPassword", async ({ email }, { rejectWithValue }) => {
  try {
    await apiFetch("/api/v1/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
    return "If an account with that email exists, password reset instructions have been sent."
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to process forgot password request.")
  }
})

export const resetPasswordAsync = createAsyncThunk<
  string,
  { token: string; newPassword: string },
  { rejectValue: string }
>("auth/resetPassword", async ({ token, newPassword }, { rejectWithValue }) => {
  try {
    await apiFetch("/api/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    })
    return "Password has been successfully reset. You can now log in with your new password."
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to reset password. The link may be expired or invalid.")
  }
})

export const changePasswordAsync = createAsyncThunk<
  string,
  { oldPassword: string; newPassword: string },
  { rejectValue: string }
>("auth/changePassword", async ({ oldPassword, newPassword }, { rejectWithValue }) => {
  try {
    await apiFetch("/api/v1/auth/password/change", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    })
    return "Password changed successfully."
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to change password. Ensure your old password is correct.")
  }
})

export const verifyEmailAsync = createAsyncThunk<
  string,
  { token: string },
  { rejectValue: string }
>("auth/verifyEmail", async ({ token }, { rejectWithValue }) => {
  try {
    await apiFetch("/api/v1/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
    return "Email successfully verified!"
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to verify email. The link may be invalid or expired.")
  }
})

export const resendVerificationAsync = createAsyncThunk<
  string,
  undefined,
  { rejectValue: string }
>("auth/resendVerification", async (_, { rejectWithValue }) => {
  try {
    await apiFetch("/api/v1/auth/email/verify/resend", { method: "POST" })
    return "Verification email resent successfully."
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to resend verification email.")
  }
})

export const deleteAccountAsync = createAsyncThunk<
  undefined,
  { password: string },
  { rejectValue: string }
>("auth/deleteAccount", async ({ password }, { rejectWithValue }) => {
  try {
    await apiFetch("/api/v1/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    })
    clearTokens()
    return undefined
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return rejectWithValue(err.message)
    }
    return rejectWithValue("Failed to delete account. Password may be incorrect.")
  }
})

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerAsync.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Registration failed"
      })
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Login failed"
      })
      // FetchMe
      .addCase(fetchMeAsync.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchMeAsync.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false
        state.isInitialChecked = true
        state.isAuthenticated = true
        state.user = action.payload
      })
      .addCase(fetchMeAsync.rejected, (state) => {
        state.isLoading = false
        state.isInitialChecked = true
        state.isAuthenticated = false
        state.user = null
        state.accessToken = null
        state.refreshToken = null
      })
      // Logout & LogoutAll
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
      .addCase(logoutAllAsync.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
      // Forgot Password
      .addCase(forgotPasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.successMessage = null
      })
      .addCase(forgotPasswordAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.successMessage = action.payload
      })
      .addCase(forgotPasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Failed to send reset link"
      })
      // Reset Password
      .addCase(resetPasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.successMessage = null
      })
      .addCase(resetPasswordAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.successMessage = action.payload
      })
      .addCase(resetPasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Reset password failed"
      })
      // Change Password
      .addCase(changePasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.successMessage = null
      })
      .addCase(changePasswordAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.successMessage = action.payload
      })
      .addCase(changePasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Change password failed"
      })
      // Verify Email
      .addCase(verifyEmailAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyEmailAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.successMessage = action.payload
      })
      .addCase(verifyEmailAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Verification failed"
      })
      // Resend Verification
      .addCase(resendVerificationAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resendVerificationAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.successMessage = action.payload
      })
      .addCase(resendVerificationAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Resend failed"
      })
      // Delete Account
      .addCase(deleteAccountAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteAccountAsync.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
      .addCase(deleteAccountAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload ?? "Account deletion failed"
      })
  },
})

export const { clearAuthError, clearSuccessMessage } = authSlice.actions
export default authSlice.reducer
