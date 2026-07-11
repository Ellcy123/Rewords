import { selectDiscoveredItems } from '../engine/selectors'
import { useGame } from '../game/useGame'
import { Sheet } from '../shell/Sheet'

export function InventorySheet({ onClose }: { onClose: () => void }) {
  const { state } = useGame()
  return <Sheet title="礼物背包" onClose={onClose}><div className="inventory-list">{selectDiscoveredItems(state).map(item => <div key={item.id}><span>{item.icon}</span><div><b>{item.shortName} ×{state.inventory[item.id]}</b><p>{item.description}</p></div></div>)}</div></Sheet>
}
