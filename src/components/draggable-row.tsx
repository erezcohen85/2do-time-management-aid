import { useDraggable } from '@dnd-kit/core'
import { ItemRow, type ItemRowProps } from '@/components/item-row'
import { useI18n } from '@/i18n'

/** An item row that can be dragged onto an area, project or "Loose tasks" header. Only top-level tasks move (subtasks follow their task). */
export function DraggableRow(props: Omit<ItemRowProps, 'rowRef' | 'dragging' | 'dragHandle'>) {
  const { t } = useI18n()
  const movable = props.item.parentId === null
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item-${props.item.id}`,
    data: { itemId: props.item.id },
    disabled: !movable,
  })
  return <ItemRow {...props} dragLabel={t('tm.dragAssign')} rowRef={setNodeRef} dragging={isDragging} dragHandle={movable ? { ...attributes, ...listeners } : undefined} />
}
