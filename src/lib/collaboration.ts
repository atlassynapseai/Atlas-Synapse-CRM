interface Comment {
  id: string;
  leadId: string;
  author: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

interface ActivityLog {
  id: string;
  leadId: string;
  action: string;
  actor: string;
  details: Record<string, any>;
  timestamp: string;
}

interface SharedFile {
  id: string;
  leadId: string;
  fileName: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Parse mentions from comment text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

// Create comment with mention notifications
export async function createComment(
  leadId: string,
  author: string,
  content: string
): Promise<Comment> {
  const mentions = extractMentions(content);

  const comment: Comment = {
    id: `comment_${Date.now()}`,
    leadId,
    author,
    content,
    mentions,
    createdAt: new Date().toISOString(),
  };

  return comment;
}

// Log activity for audit trail
export function logActivity(
  leadId: string,
  action: string,
  actor: string,
  details: Record<string, any>
): ActivityLog {
  return {
    id: `activity_${Date.now()}`,
    leadId,
    action,
    actor,
    details,
    timestamp: new Date().toISOString(),
  };
}

// Generate activity feed
export async function getActivityFeed(
  leadId: string,
  limit = 20
): Promise<ActivityLog[]> {
  // This would query from Supabase in real implementation
  return [];
}
