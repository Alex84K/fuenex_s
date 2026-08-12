import type { FC } from "react"
import { ApiError } from "../../utils/api"
import { useDeleteEstimate } from "../../features/estimates/estimates.hooks"
import type { EstimateSummary } from "../../features/estimates/types"
import { ConfirmDeleteModal } from "./ConfirmDeleteModal"

type Props = {
  estimate: EstimateSummary
  onClose: () => void
}

export const DeleteEstimateModal: FC<Props> = ({ estimate, onClose }) => {
  const deleteEstimate = useDeleteEstimate()

  const errorMessage =
    deleteEstimate.error instanceof ApiError
      ? deleteEstimate.error.message
      : deleteEstimate.error
        ? "Не удалось удалить смету"
        : null

  return (
    <ConfirmDeleteModal
      title="Удаление сметы"
      message={
        <>
          Удалить смету <strong>{estimate.title || "Без названия"}</strong>?
          Позиции сметы тоже будут удалены.
        </>
      }
      error={errorMessage}
      isPending={deleteEstimate.isPending}
      onConfirm={() => {
        deleteEstimate.mutate(
          { id: estimate.id, projectId: estimate.projectId },
          { onSuccess: onClose },
        )
      }}
      onClose={onClose}
    />
  )
}
