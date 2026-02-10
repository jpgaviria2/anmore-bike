/**
 * Route Management Library for Approved Routes
 * 
 * Handles loading and subscribing to admin-approved routes stored as Nostr events.
 * Uses NIP-78 (kind:30078) parameterized replaceable events for persistent storage.
 */

import { SimplePool } from 'nostr-tools/pool';
import { NOSTR_RELAYS, ADMIN_NPUB } from './config.ts';
import * as nip19 from 'nostr-tools/nip19';

// Re-export relays for convenience
export const RELAYS = NOSTR_RELAYS;

/**
 * Interface for approved route data
 */
export interface ApprovedRoute {
  id: string;                    // Event ID
  name: string;                  // Route name
  category: string;              // Category: 'bike-train', 'trail', or 'pump-track'
  geoJSON: any;                  // GeoJSON data for map display
  description: string;           // Route description
  approvalNote?: string;         // Admin's approval note
  contributor?: string;          // Original contributor npub
  approvedAt: Date;              // Approval timestamp
  adminName?: string;            // Admin who approved
  difficulty?: string;           // Difficulty level (for trails)
  surface?: string;              // Surface type
  length?: number;               // Route length in meters
}

/**
 * Load all approved routes from Nostr relays
 * 
 * @param category - Filter by category ('bike-train', 'trail', 'pump-track', or 'all')
 * @returns Array of approved routes
 */
export async function loadApprovedRoutes(category: string = 'all'): Promise<ApprovedRoute[]> {
  console.log(`📥 Loading approved routes (category: ${category})...`);
  
  const pool = new SimplePool();
  
  try {
    // Decode admin npub to hex pubkey
    const decoded = nip19.decode(ADMIN_NPUB);
    const adminPubkey = decoded.data as string;
    console.log(`🔑 Admin pubkey: ${adminPubkey.substring(0, 8)}...`);
    
    // Build filter for approved routes
    const filter: any = {
      kinds: [30078],                    // NIP-78: Application-specific data
      authors: [adminPubkey],            // Only from admin
      '#t': ['anmore-bike'],             // Tagged with app identifier
      '#status': ['active']              // Only active routes
    };
    
    // Add category filter if not 'all'
    if (category !== 'all') {
      filter['#category'] = [category];
    }
    
    console.log('🔍 Querying relays with filter:', filter);
    
    // Query relays
    const events = await pool.querySync(RELAYS, filter);
    console.log(`✅ Found ${events.length} approved routes`);
    
    // Parse events into route objects
    const routes = events.map(event => {
      try {
        const content = JSON.parse(event.content);
        
        // Extract tags
        const nameTag = event.tags.find(t => t[0] === 'name');
        const categoryTag = event.tags.find(t => t[0] === 'category');
        const contributorTag = event.tags.find(t => t[0] === 'contributor');
        const approvedAtTag = event.tags.find(t => t[0] === 'approved_at');
        
        const route: ApprovedRoute = {
          id: event.id,
          name: nameTag?.[1] || 'Unnamed Route',
          category: categoryTag?.[1] || 'unknown',
          geoJSON: content.geoJSON,
          description: content.description || '',
          approvalNote: content.approvalNote,
          contributor: contributorTag?.[1],
          approvedAt: new Date(parseInt(approvedAtTag?.[1] || '0') * 1000),
          adminName: content.adminName,
          difficulty: content.geoJSON?.features?.[0]?.properties?.difficulty,
          surface: content.geoJSON?.features?.[0]?.properties?.surface,
          length: content.geoJSON?.features?.[0]?.properties?.length
        };
        
        return route;
      } catch (error) {
        console.error('Error parsing route event:', error, event);
        return null;
      }
    }).filter(r => r !== null) as ApprovedRoute[];
    
    // Sort by approval date (newest first)
    routes.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
    
    console.log(`✅ Parsed ${routes.length} valid routes`);
    return routes;
    
  } catch (error) {
    console.error('❌ Error loading approved routes:', error);
    return [];
  } finally {
    // Always close pool connections
    pool.close(RELAYS);
  }
}

/**
 * Subscribe to real-time route approvals
 * 
 * @param category - Category to subscribe to
 * @param onNewRoute - Callback when new route is approved
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToApprovals(
  category: string,
  onNewRoute: (route: ApprovedRoute) => void
): () => void {
  console.log(`📡 Subscribing to real-time approvals (category: ${category})...`);
  
  const pool = new SimplePool();
  
  try {
    // Decode admin npub to hex pubkey
    const decoded = nip19.decode(ADMIN_NPUB);
    const adminPubkey = decoded.data as string;
    
    // Build filter for new approvals (since now)
    const filter: any = {
      kinds: [30078],
      authors: [adminPubkey],
      '#t': ['anmore-bike'],
      '#status': ['active'],
      since: Math.floor(Date.now() / 1000)  // Only new events from now
    };
    
    if (category !== 'all') {
      filter['#category'] = [category];
    }
    
    // Subscribe to relay updates
    const sub = pool.subscribeMany(
      RELAYS,
      [filter],
      {
        onevent(event) {
          try {
            console.log('🆕 New approval received:', event.id);
            
            const content = JSON.parse(event.content);
            const nameTag = event.tags.find(t => t[0] === 'name');
            const categoryTag = event.tags.find(t => t[0] === 'category');
            const contributorTag = event.tags.find(t => t[0] === 'contributor');
            const approvedAtTag = event.tags.find(t => t[0] === 'approved_at');
            
            const route: ApprovedRoute = {
              id: event.id,
              name: nameTag?.[1] || 'Unnamed Route',
              category: categoryTag?.[1] || 'unknown',
              geoJSON: content.geoJSON,
              description: content.description || '',
              approvalNote: content.approvalNote,
              contributor: contributorTag?.[1],
              approvedAt: new Date(parseInt(approvedAtTag?.[1] || '0') * 1000),
              adminName: content.adminName
            };
            
            onNewRoute(route);
          } catch (error) {
            console.error('Error processing new route:', error);
          }
        },
        oneose() {
          console.log('✅ Subscription active - listening for new approvals');
        }
      }
    );
    
    // Return cleanup function
    return () => {
      console.log('🔌 Unsubscribing from approvals...');
      sub.close();
      pool.close(RELAYS);
    };
    
  } catch (error) {
    console.error('Error subscribing to approvals:', error);
    // Return no-op cleanup function
    return () => {};
  }
}
