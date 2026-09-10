import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';

export interface AuthenticatedWebSocket extends WebSocket {
  shop_id?: string;
  user_id?: string;
  isAlive?: boolean;
}

class SocketService {
  private wss: WebSocketServer | null = null;
  private clientsByShop: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      const parsedUrl = url.parse(req.url || '', true);
      const shopId = (parsedUrl.query.shop_id as string) || (parsedUrl.query.x_shop_id as string) || 'shop-001';
      const userId = (parsedUrl.query.user_id as string) || 'user-default';

      ws.shop_id = shopId;
      ws.user_id = userId;
      ws.isAlive = true;

      if (!this.clientsByShop.has(shopId)) {
        this.clientsByShop.set(shopId, new Set());
      }
      this.clientsByShop.get(shopId)!.add(ws);

      console.log(`🔌 [WebSocket] Client connected: user ${userId} to shop ${shopId}`);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch (e) {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        if (ws.shop_id && this.clientsByShop.has(ws.shop_id)) {
          this.clientsByShop.get(ws.shop_id)!.delete(ws);
          if (this.clientsByShop.get(ws.shop_id)!.size === 0) {
            this.clientsByShop.delete(ws.shop_id);
          }
        }
        console.log(`🔌 [WebSocket] Client disconnected: user ${userId} from shop ${shopId}`);
      });

      ws.on('error', (err) => {
        console.error('❌ [WebSocket] Socket error:', err);
      });

      // Send initial welcome message
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to Nexus Suite Real-Time Notification Stream',
        shop_id: shopId,
        timestamp: new Date().toISOString(),
      }));
    });

    // Heartbeat check every 30 seconds
    const interval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((client) => {
        const ws = client as AuthenticatedWebSocket;
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('⚡ [WebSocket] Real-time notification server initialized on path /ws');
  }

  /**
   * Broadcast real-time event to all connected admin & staff sockets for a given shop
   */
  public broadcastToShop(shopId: string, event: string, payload: any): void {
    const clients = this.clientsByShop.get(shopId);
    if (!clients || clients.size === 0) return;

    const message = JSON.stringify({
      event,
      payload,
      timestamp: new Date().toISOString(),
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast updated unread message counts per platform
   */
  public broadcastUnreadCountUpdate(shopId: string, unreadCounts: Record<string, number>): void {
    this.broadcastToShop(shopId, 'UNREAD_COUNT_UPDATE', unreadCounts);
  }
}

export const socketService = new SocketService();
