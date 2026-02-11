/**
 * Anmore.bike Route Management System
 * Loads approved routes and enables drawing + WhatsApp submission
 * Usage: Include after Leaflet and Leaflet.draw are loaded
 */

(function() {
  'use strict';
  
  // Configuration
  const ROUTES_URL = '/anmore-bike/routes.json';
  const WHATSAPP_NUMBER = '17783841055'; // JP's number
  
  // Global state
  window.anmoreRoutes = {
    approvedLayer: null,
    drawingLayer: null,
    map: null
  };
  
  /**
   * Initialize route system on a Leaflet map
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} options - Configuration options
   *   - enableDrawing: boolean (default true)
   *   - enableSubmission: boolean (default true)
   *   - category: string or array - filter routes by category (e.g., 'bike-train', ['bike-train', 'recreation'])
   *   - defaultCategory: string - default category for new submissions
   */
  window.initAnmoreRoutes = function(map, options = {}) {
    if (!map || !window.L) {
      console.error('❌ Map or Leaflet not available');
      return;
    }
    
    window.anmoreRoutes.map = map;
    window.anmoreRoutes.options = options;
    
    // Load and display approved routes (with optional category filter)
    loadApprovedRoutes(map, options.category);
    
    // Add drawing tools if enabled (default: true)
    if (options.enableDrawing !== false) {
      addDrawingTools(map, options);
    }
    
    // Add WhatsApp submission button if enabled (default: true)
    if (options.enableSubmission !== false) {
      addWhatsAppButton(map, options);
    }
    
    console.log('✅ Anmore route system initialized', options.category ? `(category: ${options.category})` : '');
  };
  
  /**
   * Load approved routes from routes.json and display on map
   * @param {L.Map} map - Leaflet map instance
   * @param {string|array} categoryFilter - Optional category filter (e.g., 'bike-train' or ['bike-train', 'recreation'])
   */
  function loadApprovedRoutes(map, categoryFilter) {
    fetch(ROUTES_URL + '?' + Date.now()) // Cache bust
      .then(response => response.json())
      .then(data => {
        if (!data || !data.features || data.features.length === 0) {
          console.log('📝 No approved routes yet');
          return;
        }
        
        // Filter by category if specified
        let features = data.features;
        if (categoryFilter) {
          const categories = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
          features = features.filter(feature => {
            const cat = feature.properties?.category;
            return cat && categories.includes(cat);
          });
          console.log(`🔍 Filtered ${data.features.length} routes → ${features.length} match category: ${categoryFilter}`);
        }
        
        if (features.length === 0) {
          console.log(`📝 No routes found for category: ${categoryFilter}`);
          return;
        }
        
        // Create filtered GeoJSON
        const filteredData = {
          ...data,
          features: features
        };
        
        // Create layer for approved routes
        const approvedLayer = L.geoJSON(filteredData, {
          style: {
            color: '#059669', // Green
            weight: 4,
            opacity: 0.8
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              const popup = `
                <div style="font-family: system-ui, sans-serif;">
                  <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
                    ${props.name || 'Unnamed Route'}
                  </h3>
                  ${props.description ? `<p style="margin: 0 0 8px 0; font-size: 14px;">${props.description}</p>` : ''}
                  <div style="font-size: 12px; color: #666;">
                    ${props.difficulty ? `<span style="display: inline-block; padding: 2px 8px; background: #e5e7eb; border-radius: 12px; margin-right: 4px;">${props.difficulty}</span>` : ''}
                    ${props.category ? `<span style="display: inline-block; padding: 2px 8px; background: #dbeafe; border-radius: 12px;">${props.category}</span>` : ''}
                  </div>
                  ${props.approved_date ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">Approved: ${props.approved_date}</p>` : ''}
                </div>
              `;
              layer.bindPopup(popup);
            }
          }
        }).addTo(map);
        
        window.anmoreRoutes.approvedLayer = approvedLayer;
        console.log(`✅ Loaded ${features.length} approved route(s)`);
      })
      .catch(error => {
        console.log('ℹ️ No routes file yet (this is normal for first use)');
      });
  }
  
  /**
   * Add drawing tools to map
   */
  function addDrawingTools(map, options) {
    if (!window.L.Control.Draw) {
      console.warn('⚠️ Leaflet.draw not available, skipping drawing tools');
      return;
    }
    
    // Create layer for user drawings
    const drawingLayer = new L.FeatureGroup();
    map.addLayer(drawingLayer);
    window.anmoreRoutes.drawingLayer = drawingLayer;
    
    // Add drawing control
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#3b82f6', // Blue for drafts
            weight: 4
          },
          showLength: true,
          metric: true,
          feet: false
        },
        polygon: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: true
      },
      edit: {
        featureGroup: drawingLayer,
        remove: true
      }
    });
    map.addControl(drawControl);
    
    // Handle drawing events
    map.on(L.Draw.Event.CREATED, function(e) {
      drawingLayer.addLayer(e.layer);
    });
  }
  
  /**
   * Add WhatsApp submission button to map
   */
  function addWhatsAppButton(map, options) {
    // Create custom control
    const WhatsAppControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.background = 'white';
        container.style.padding = '10px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        
        const button = L.DomUtil.create('button', '', container);
        button.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="24" height="24" fill="#25D366" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span style="font-weight: 600; color: #25D366;">Submit via WhatsApp</span>
          </div>
        `;
        button.style.cursor = 'pointer';
        button.style.border = 'none';
        button.style.background = 'white';
        button.style.padding = '8px 12px';
        button.style.borderRadius = '6px';
        button.style.fontSize = '14px';
        
        button.onmouseover = function() {
          this.style.background = '#f0fdf4';
        };
        button.onmouseout = function() {
          this.style.background = 'white';
        };
        
        button.onclick = function(e) {
          L.DomEvent.stopPropagation(e);
          submitViaWhatsApp();
        };
        
        return container;
      }
    });
    
    map.addControl(new WhatsAppControl());
  }
  
  /**
   * Submit route via WhatsApp
   */
  function submitViaWhatsApp() {
    const drawingLayer = window.anmoreRoutes.drawingLayer;
    const options = window.anmoreRoutes.options || {};
    
    if (!drawingLayer || drawingLayer.getLayers().length === 0) {
      alert('⚠️ Please draw a route on the map first!');
      return;
    }
    
    // Get route details from user
    const routeName = prompt('Route name:', 'New Bike Route');
    if (!routeName) return;
    
    const description = prompt('Brief description (optional):', '');
    const difficulty = prompt('Difficulty (Easy/Moderate/Challenging):', 'Easy');
    
    // Use default category from options, or prompt user
    const defaultCat = options.defaultCategory || 'bike-train';
    const category = prompt('Category (bike-train/recreation/commute/pump-track/trail):', defaultCat);
    
    // Convert drawn features to GeoJSON
    const geoJSON = drawingLayer.toGeoJSON();
    geoJSON.metadata = {
      created: new Date().toISOString(),
      tool: 'anmore-bike-map',
      location: 'Anmore, BC',
      type: 'bike-route'
    };
    
    // Add properties to features
    geoJSON.features.forEach(feature => {
      feature.properties = {
        name: routeName,
        description: description || '',
        difficulty: difficulty,
        category: category
      };
    });
    
    // Copy GeoJSON to clipboard first
    const geoJSONString = JSON.stringify(geoJSON, null, 2);
    
    navigator.clipboard.writeText(geoJSONString).then(() => {
      // Create shorter WhatsApp message
      const message = `🚴 New Bike Route Submission

**Route Name:** ${routeName}
**Description:** ${description || 'N/A'}
**Difficulty:** ${difficulty}
**Category:** ${category}

**GeoJSON Data:**
(Copied to clipboard - paste below)

Submitted from anmore.bike map`;
      
      // Open WhatsApp
      const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(whatsappURL, '_blank');
      
      // Show confirmation
      alert('✅ GeoJSON copied to clipboard!\n\nWhatsApp is opening...\n\n1. Type your message in WhatsApp\n2. Press and hold in the text field\n3. Tap "Paste" to add the GeoJSON\n4. Click Send!');
      
    }).catch(err => {
      // Clipboard failed - show GeoJSON for manual copy
      const copyBox = document.createElement('div');
      copyBox.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border:2px solid #333;z-index:10000;max-width:80%;max-height:80%;overflow:auto;';
      copyBox.innerHTML = `
        <h3>📋 Copy This GeoJSON:</h3>
        <p>Select all text below and copy (Ctrl+C or Cmd+C):</p>
        <textarea style="width:100%;height:200px;font-family:monospace;font-size:12px;" readonly>${geoJSONString}</textarea>
        <button onclick="this.parentElement.remove()" style="margin-top:10px;padding:10px 20px;background:#25D366;color:white;border:none;border-radius:4px;cursor:pointer;">
          Close & Open WhatsApp
        </button>
      `;
      
      document.body.appendChild(copyBox);
      
      copyBox.querySelector('button').addEventListener('click', () => {
        // Create message without GeoJSON
        const message = `🚴 New Bike Route Submission

**Route Name:** ${routeName}
**Description:** ${description || 'N/A'}
**Difficulty:** ${difficulty}
**Category:** ${category}

**GeoJSON Data:**
(See copied text - paste it here)

Submitted from anmore.bike map`;
        
        const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappURL, '_blank');
      });
    });
  }
  
  /**
   * Clear user drawings
   */
  window.clearAnmoreDrawing = function() {
    const drawingLayer = window.anmoreRoutes.drawingLayer;
    if (drawingLayer) {
      drawingLayer.clearLayers();
      console.log('🗑️ Drawing cleared');
    }
  };
  
  /**
   * Get current drawing as GeoJSON
   */
  window.getAnmoreDrawing = function() {
    const drawingLayer = window.anmoreRoutes.drawingLayer;
    if (!drawingLayer || drawingLayer.getLayers().length === 0) {
      return null;
    }
    return drawingLayer.toGeoJSON();
  };
  
  console.log('📦 Anmore route system loaded');
})();
