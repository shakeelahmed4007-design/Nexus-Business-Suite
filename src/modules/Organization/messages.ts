export type Message = {
  id: string;
  channel: 'Email' | 'WhatsApp';
  contact: string;
  preview: string;
  time: string;
  unread: boolean;
  avatar: string;
};

export const conversations: Message[] = [
  { id: 'M-001', channel: 'WhatsApp', contact: 'Sara Ahmed', preview: 'Hi! Is the smart watch still available?', time: '11:42 AM', unread: true, avatar: 'SA' },
  { id: 'M-002', channel: 'WhatsApp', contact: 'Bilal Raza', preview: 'Can you share the bulk pricing for 50 units?', time: '10:15 AM', unread: true, avatar: 'BR' },
  { id: 'M-003', channel: 'Email', contact: 'hina@blueocean.io', preview: 'Re: Proposal for Q3 partnership — attached...', time: '09:30 AM', unread: true, avatar: 'HM' },
  { id: 'M-004', channel: 'WhatsApp', contact: 'Ayesha Khan', preview: 'Thank you for the quick response!', time: 'Yesterday', unread: false, avatar: 'AK' },
  { id: 'M-005', channel: 'Email', contact: 'usman@peakfit.com', preview: 'Order confirmation needed for ORD-2039', time: 'Yesterday', unread: false, avatar: 'UT' },
  { id: 'M-006', channel: 'Email', contact: 'hamza@foodhub.com', preview: 'Invoice received, processing payment.', time: '2 days ago', unread: false, avatar: 'HS' },
  { id: 'M-007', channel: 'WhatsApp', contact: 'Maria Yousuf', preview: 'What are your business hours on Saturday?', time: '2 days ago', unread: false, avatar: 'MY' },
  { id: 'M-008', channel: 'Email', contact: 'kashif@medicare.pk', preview: 'Following up on the medical equipment quote.', time: '3 days ago', unread: false, avatar: 'KI' },
];

export type ChatMessage = {
  id: string;
  sender: 'them' | 'me';
  text: string;
  time: string;
};

export const chatThread: ChatMessage[] = [
  { id: '1', sender: 'them', text: 'Hi! Is the smart watch still available?', time: '11:40 AM' },
  { id: '2', sender: 'me', text: 'Hi Sara! Yes, the Smart Watch Pro is in stock. We have 12 units available right now.', time: '11:41 AM' },
  { id: '3', sender: 'them', text: 'Great! Can you share the price and warranty details?', time: '11:41 AM' },
  { id: '4', sender: 'me', text: 'It\'s PKR 12,000 with a 1-year warranty. We also offer free delivery within Karachi.', time: '11:42 AM' },
  { id: '5', sender: 'them', text: 'Perfect, I\'ll take one. How do I place the order?', time: '11:42 AM' },
];

export const quickReplies = [
  'Yes, that item is in stock!',
  'Let me check and get back to you.',
  'Our business hours are 9 AM - 7 PM.',
  'Free delivery on orders above PKR 5,000.',
  'You can place an order via our website.',
];
