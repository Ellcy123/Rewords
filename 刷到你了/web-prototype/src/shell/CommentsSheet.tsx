import type { VideoNode } from '../content/types'
import { Sheet } from './Sheet'

export function CommentsSheet({ node, onClose }: { node: VideoNode; onClose: () => void }) {
  return <Sheet title={`${node.comments.length * 1280} 条评论`} onClose={onClose}><div className="comment-list">{node.comments.map(comment => <article key={comment.id}><span>{comment.author.slice(0, 1)}</span><div><b>{comment.author}{comment.pinned && <em>置顶</em>}</b><p>{comment.text}</p><small>♡ {comment.likes}</small></div></article>)}</div></Sheet>
}
