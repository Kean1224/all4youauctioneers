'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface BidUpdate {
  type: 'bid_update';
  currentBid: number;
  bidderEmail: string;
  bidAmount: number;
  lotTitle: string;
  timestamp: string;
  bidIncrement: number;
  nextMinBid: number;
  isAutoBid?: boolean;
  autoBidder?: string;
}

export interface TimerUpdate {
  type: 'timer_update';
  timeRemaining: number;
  status: 'active' | 'extended' | 'closing' | 'closed';
}

export interface AuctionUpdate {
  type: 'auction_update';
  status: 'started' | 'paused' | 'ended';
  message?: string;
}

export interface OutbidNotification {
  type: 'outbid_notification';
  message: string;
  lotId: string;
  auctionId: string;
  newBid: number;
  lotTitle: string;
  isAutoBid?: boolean;
}

export type WebSocketMessage = BidUpdate | TimerUpdate | AuctionUpdate | OutbidNotification;

interface UseAuctionWebSocketOptions {
  auctionId?: string;
  onBidUpdate?: (data: BidUpdate) => void;
  onTimerUpdate?: (data: TimerUpdate) => void;
  onAuctionUpdate?: (data: AuctionUpdate) => void;
  onOutbidNotification?: (data: OutbidNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useAuctionWebSocket({
  auctionId,
  onBidUpdate,
  onTimerUpdate,
  onAuctionUpdate,
  onOutbidNotification,
  onConnectionChange
}: UseAuctionWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const getUserEmail = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email;
      }
    } catch (error) {
      console.error('Failed to get user email:', error);
    }
    return null;
  }, []);

  const connect = useCallback(async () => {
    const email = getUserEmail();
    if (!email) {
      setError('User not authenticated');
      return;
    }

    try {
      const { getRealtimeUrl } = await import('../lib/api');
      const wsUrl = getRealtimeUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected for auction:', auctionId);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        onConnectionChange?.(true);

        // Register user and subscribe to auction if auctionId provided
        wsRef.current?.send(JSON.stringify({ 
          type: 'register', 
          email 
        }));

        if (auctionId) {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe_auction',
            auctionId,
            email
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);

          // Route message to appropriate handler
          switch (data.type) {
            case 'bid_update':
              onBidUpdate?.(data);
              break;
            case 'timer_update':
              onTimerUpdate?.(data);
              break;
            case 'auction_update':
              onAuctionUpdate?.(data);
              break;
            case 'outbid_notification':
              onOutbidNotification?.(data);
              break;
            default:
              console.log('Unknown message type:', data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('📪 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onConnectionChange?.(false);

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttempts.current);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Failed to reconnect after multiple attempts');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to establish connection');
    }
  }, [auctionId, onBidUpdate, onTimerUpdate, onAuctionUpdate, onOutbidNotification, onConnectionChange, getUserEmail]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setError(null);
  }, []);

  const subscribeToAuction = useCallback((newAuctionId: string) => {
    const email = getUserEmail();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && email) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_auction',
        auctionId: newAuctionId,
        email
      }));
    }
  }, [getUserEmail]);

  const unsubscribeFromAuction = useCallback((targetAuctionId: string) => {
    const email = getUserEmail();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && email) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_auction',
        auctionId: targetAuctionId,
        email
      }));
    }
  }, [getUserEmail]);

  // Initialize connection
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle auction ID changes
  useEffect(() => {
    if (auctionId && isConnected) {
      subscribeToAuction(auctionId);
    }
  }, [auctionId, isConnected, subscribeToAuction]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    subscribeToAuction,
    unsubscribeFromAuction
  };
}
