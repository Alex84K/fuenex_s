import type { FC, ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAppSelector } from "../../../app/hooks"

type Props = {
  children?: ReactNode
}

export const PublicOnlyRoute: FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}
