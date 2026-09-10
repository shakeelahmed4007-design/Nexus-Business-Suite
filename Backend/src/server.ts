import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { socketService } from './services/socketService';
import { seedIntegrations } from './seedIntegrations';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Real-Time WebSocket Server
socketService.init(server);

// Seed initial Phase 4 integration data in Supabase & memory
seedIntegrations('shop-001').catch(() => {});

server.listen(PORT, () => {
  console.log(`🚀 Nexus CRM Backend Server running on http://localhost:${PORT}`);
  console.log(`🔒 Supabase Multi-Tenant Integration Enabled`);
  console.log(`⚡ Real-Time WebSocket stream listening on ws://localhost:${PORT}/ws`);
});
