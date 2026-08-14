import type { FC } from "react"
import { ConfirmDeleteModal } from "./ConfirmDeleteModal"

type Props = {
  name: string
  isPending?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

// Подтверждение удаления комплекта (DESIGN §10.1). Обёртка над общим
// ConfirmDeleteModal — сообщение называет комплект, чтобы удаление не было
// «молчаливым нажатием на корзину»: вместе с комплектом уходят все его
// поверхности и проёмы (мягко, каскадом).
export const DeleteMeasurementSetModal: FC<Props> = ({
  name,
  isPending = false,
  error = null,
  onConfirm,
  onClose,
}) => (
  <ConfirmDeleteModal
    title="Удалить комплект замеров?"
    message={
      <>
        Комплект «<strong>{name}</strong>» и все его поверхности и проёмы будут
        удалены. Действие нельзя отменить.
      </>
    }
    isPending={isPending}
    error={error}
    onConfirm={onConfirm}
    onClose={onClose}
  />
)
