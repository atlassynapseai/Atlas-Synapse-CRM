import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Send, User } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  author: string;
  content: string;
  created_at: string;
  mentions?: string[];
}

export const CommentsThread: React.FC<{ leadId: string; user: string }> = ({
  leadId,
  user,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [leadId]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/comments?leadId=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          author: user,
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        loadComments();
        toast.success('Comment added');
      }
    } catch (error) {
      toast.error('Failed to add comment');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-sm text-white flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Comments & Collaboration
      </h3>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {comment.author.charAt(0)}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">
                  {comment.author}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {comment.content}
            </p>
            {comment.mentions && comment.mentions.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {comment.mentions.map((mention) => (
                  <span
                    key={mention}
                    className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded"
                  >
                    @{mention}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Comment... (use @name to mention)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addComment()}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={addComment}
          disabled={loading || !newComment.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-bold transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
