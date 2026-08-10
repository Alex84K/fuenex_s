import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import {
  changePasswordAsync,
  clearAuthError,
  clearSuccessMessage,
  deleteAccountAsync,
  logoutAllAsync,
  logoutAsync,
  resendVerificationAsync,
} from "../authSlice"

export const ProfilePage: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, isLoading, error, successMessage } = useAppSelector((state) => state.auth)

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [deletePassword, setDeletePassword] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleChangePassword = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordError("Новый пароль должен содержать от 8 до 72 символов")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Новые пароли не совпадают")
      return
    }

    void dispatch(changePasswordAsync({ oldPassword, newPassword })).then((res) => {
      if (changePasswordAsync.fulfilled.match(res)) {
        setOldPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      }
    })
  }

  const handleResendVerification = () => {
    void dispatch(resendVerificationAsync())
  }

  const handleLogout = () => {
    void dispatch(logoutAsync()).then(() => {
      void navigate("/login")
    })
  }

  const handleLogoutAll = () => {
    void dispatch(logoutAllAsync()).then(() => {
      void navigate("/login")
    })
  }

  const handleDeleteAccount = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deletePassword) return
    void dispatch(deleteAccountAsync({ password: deletePassword })).then((res) => {
      if (deleteAccountAsync.fulfilled.match(res)) {
        void navigate("/login")
      }
    })
  }

  const activeError = passwordError ?? error

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h2 className="fw-bold mb-4">Профиль пользователя</h2>

          {activeError && (
            <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
              {activeError}
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setPasswordError(null)
                  dispatch(clearAuthError())
                }}
              ></button>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
              {successMessage}
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  dispatch(clearSuccessMessage())
                }}
              ></button>
            </div>
          )}

          {/* User Info Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Информация об аккаунте</h5>
              <div className="row mb-2">
                <div className="col-sm-3 text-muted">ID:</div>
                <div className="col-sm-9 fw-semibold text-break">{user?.id}</div>
              </div>
              <div className="row mb-3">
                <div className="col-sm-3 text-muted">Email:</div>
                <div className="col-sm-9 fw-semibold">{user?.email}</div>
              </div>
              <div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                >
                  Отправить повторно письмо подтверждения email
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Смена пароля</h5>
              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Старый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value)
                    }}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Новый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="От 8 до 72 символов"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                    }}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Повторите новый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value)
                    }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary fw-bold" disabled={isLoading}>
                  {isLoading ? "Сохранение..." : "Изменить пароль"}
                </button>
              </form>
            </div>
          </div>

          {/* Sessions & Logout */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Управление сессиями</h5>
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-outline-dark" onClick={handleLogout} disabled={isLoading}>
                  Выйти из системы
                </button>
                <button className="btn btn-outline-danger" onClick={handleLogoutAll} disabled={isLoading}>
                  Выйти со всех устройств
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="card border-danger shadow-sm rounded-4">
            <div className="card-body p-4">
              <h5 className="card-title text-danger fw-bold mb-2">Опасная зона</h5>
              <p className="text-muted small">
                Удаление аккаунта приведет к безвозвратной потере всех ваших данных.
              </p>
              {!showDeleteConfirm ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    setShowDeleteConfirm(true)
                  }}
                >
                  Удалить аккаунт
                </button>
              ) : (
                <form onSubmit={handleDeleteAccount} className="mt-3 bg-light p-3 rounded-3">
                  <p className="fw-semibold text-danger mb-2">
                    Внимание! Подтвердите удаление, введя текущий пароль:
                  </p>
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Текущий пароль"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value)
                      }}
                      required
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-danger btn-sm fw-bold" disabled={isLoading}>
                      Подтвердить удаление
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
