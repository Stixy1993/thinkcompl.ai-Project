import ChatWidget from '@/components/ChatWidget';

export default function ChatPage() {
  return (
    <ChatWidget apiEndpoint="/api/claude/chat" fullPage={true} />
  );
} 