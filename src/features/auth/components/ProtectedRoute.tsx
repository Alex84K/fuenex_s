import type { FC, ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAppSelector } from "../../../app/hooks"

type Props = {
  children?: ReactNode
}

export const ProtectedRoute: FC<Props> = ({ children }) => {
  const { isAuthenticated, isInitialChecked, isLoading } = useAppSelector((state) => state.auth)

  if (!isInitialChecked && isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
