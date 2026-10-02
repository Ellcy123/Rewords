using UnityEngine;
using UnityEngine.EventSystems;
namespace CatGame.Presentation
{
    public sealed class PiecePointer : MonoBehaviour,IPointerClickHandler,IBeginDragHandler,IDragHandler,IEndDragHandler
    {
        public BoardPresenter owner;
        public string instanceId;
        public int offsetX,offsetY;
        public void OnPointerClick(PointerEventData e){owner.Select(instanceId);}
        public void OnBeginDrag(PointerEventData e){owner.Begin(instanceId,offsetX,offsetY,e.position);}
        public void OnDrag(PointerEventData e){owner.Drag(e.position);}
        public void OnEndDrag(PointerEventData e){owner.End(e.position);}
    }
}
