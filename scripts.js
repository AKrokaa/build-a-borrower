let configData = {};
let currentTab = 'body';
const currentFilename = {};
const palettes = {};

// Tab switching and palette rendering
function showTab(tab) {
    currentTab = tab;
  
    // Activate corresponding tab content
    document.querySelectorAll('.tab-content').forEach(c =>
      c.classList.remove('active')
    );
    document.getElementById(tab)?.classList.add('active');
  
    // Activate corresponding tab button
    document.querySelectorAll('.tab-button').forEach(b =>
      b.classList.remove('active')
    );
    document
      .querySelector(`.tab-button[data-tab="${tab}"]`)
      ?.classList.add('active');
  
    renderPalette();
  
    const dependencyKey = configData.dependencies?.[tab];
    if (dependencyKey) {
      filterDependentThumbnails(tab, dependencyKey);
    }
  }
  

function renderPalette() {
  const palette = document.getElementById('colorPalette');
  palette.innerHTML = '';

  const colors = palettes[currentTab] || [];

  if (colors.length) {
    palette.style.display = 'flex';

    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch';
      btn.style.background = color;
      btn.onclick = () => applyColor(color);
      palette.appendChild(btn);
    });
  } else {
    palette.style.display = 'none';
  }
}

function filterDependentThumbnails(tabId, dependsOn) {
  const raw = currentFilename[dependsOn] || '';
  const base = raw.split('_')[0].toLowerCase();

  const thumbs = document.querySelectorAll(`#${tabId} .thumbnail`);
  thumbs.forEach(img => {
    const name = img.src.split('/').pop().split('.')[0].toLowerCase();
    if (
      name === 'none' ||
      !base ||
      name.startsWith(base + '_')
    ) {
      img.style.display = '';
    } else {
      img.style.display = 'none';
    }
  });
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)] || null;
}

function randomizeAvatar() {
    const baseLayers = Object.keys(configData.categories)
      .filter(cat => !Object.keys(configData.dependencies || {}).includes(cat));
  
    // Step 1: Randomize base layers
    baseLayers.forEach(feature => {
      const validImages = configData.categories[feature]
        .filter(name => name !== 'none');
  
      const choice = pickRandom(validImages);
  
      if (choice) {
        const fullImagePath = `assets/${feature}/${choice}.png`;
        updateLayer(feature, fullImagePath);
      } else {
        const fallbackImage = `assets/${feature}/default.png`;
        updateLayer(feature, fallbackImage);
      }
    });
  
    // Step 2: Wait a moment before applying dependent layers
    setTimeout(() => {
      const dependents = configData.dependencies || {};
      Object.entries(dependents).forEach(([depTab, baseTab]) => {
        const raw = currentFilename[baseTab] || '';
        const base = raw.split('_')[0].toLowerCase();
        const options = configData.categories[depTab] || [];
        const valid = options.filter(opt => opt.startsWith(base + '_'));
  
        const choice = pickRandom(valid);
        if (choice) {
          const fullImagePath = `assets/${depTab}/${choice}.png`;
          updateLayer(depTab, fullImagePath);
        } else {
          removeLayer(depTab);
        }
      });
    }, 100); // Slight delay ensures base layers have updated currentFilename
  }
  

async function loadAssetConfig() {
    const response = await fetch('assets/config.json');
    const config = await response.json();
    configData = config;
  
    Object.assign(palettes, config.colors || {});
    const tabWrapper = document.getElementById('tabs');
    const contentWrapper = document.getElementById('tabContents');
  
    Object.keys(config.categories).forEach((category, index) => {
        // Create tab button
        const btn = document.createElement('button');
        btn.className = 'tab-button';
        btn.textContent = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        btn.onclick = () => showTab(category);
        if (index === 0) btn.classList.add('active');
        tabWrapper.appendChild(btn);
        btn.setAttribute('data-tab', category);
            
        // Create tab content div
        const div = document.createElement('div');
        div.id = category;
        div.className = 'tab-content';
        if (index === 0) div.classList.add('active');
        contentWrapper.appendChild(div);
    
        // Add 'none' thumbnail
        const noneImg = document.createElement('img');
        noneImg.src = `assets/none.png`;
        noneImg.classList.add('thumbnail');
        noneImg.onclick = () => removeLayer(category);
        div.appendChild(noneImg);
    
        // Add each asset
        config.categories[category].forEach(name => {
            const fullSrc = `assets/${category}/${name}.png`;
            const thumbSrc = `assets/thumbnails/${category}/${name}_thumb.png`;
          
            const thumbImg = document.createElement('img');
            thumbImg.src = thumbSrc;
            thumbImg.classList.add('thumbnail');
            thumbImg.onclick = () => updateLayer(category, fullSrc);
            div.appendChild(thumbImg);
          
            // Fallback for thumbnail not loading
            thumbImg.onerror = () => {
            thumbImg.src = fullSrc;
            };
          });
          
        
        
    });
    const avatarContainer = document.getElementById('avatarContainer');
    avatarContainer.innerHTML = ''; // Clear any existing layers

    config.layers.forEach(layer => {
        const img = document.createElement('img');
        img.id = 'layer-' + layer;
        img.src = '';
        img.style.display = 'none';  // hide by default
        img.alt = layer.replace(/_/g, ' ');
        avatarContainer.appendChild(img);
    });
    randomizeAvatar();
  }
  function updateLayer(layer, src) {
    const img = document.getElementById('layer-' + layer);
    if (img) {
      const newFilename = src.split('/').pop().split('.')[0];
      currentFilename[layer] = newFilename;
      img.src = src;
      img.style.display = '';
  
      // Check and fix dependent layers if any
      Object.entries(configData.dependencies || {}).forEach(([dependent, base]) => {
        if (base === layer) {
          const dependentImg = document.getElementById('layer-' + dependent);
          const dependentFilename = currentFilename[dependent] || '';
          const basePrefix = newFilename.split('_')[0].toLowerCase();
  
          // If dependent layer is incompatible, reset it
          if (
            dependentFilename &&
            dependentFilename !== 'none' &&
            !dependentFilename.startsWith(basePrefix + '_')
          ) {
            removeLayer(dependent);
            currentFilename[dependent] = 'none';
          }
        }
      });
    } else {
      console.error(`Layer ${layer} not found`);
    }
  }
  

  function removeLayer(layer) {
    const img = document.getElementById('layer-' + layer);
    if (img) {
      img.style.display = 'none';
      currentFilename[layer] = 'none';
    }
  }
  

function applyColor(color) {
  const fname = currentFilename[currentTab];
  document.getElementById('layer-' + currentTab).src = `assets/${currentTab}/${fname}_${color}.png`;
}

function scrollTabs(dir) {
  document.getElementById('tabs').scrollLeft += dir * 100;
}

function downloadAvatar() {
    const orderedLayers = configData.layers || [];
    
    const srcs = orderedLayers
      .map(id => document.getElementById('layer-' + id))
      .filter(el => el && el.src && !el.src.endsWith('none.png') && el.style.display !== 'none')
      .map(el => el.src);


  if (!srcs.length) {
    alert("Nothing to download!");
    return;
  }

  const first = new Image();
  first.onload = () => {
    const W = first.naturalWidth;
    const H = first.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const draws = srcs.map(src =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, W, H);
          res();
        };
        img.onerror = rej;
        img.src = src;
      })
    );

    Promise.all(draws).then(() => {
      canvas.toBlob(blob => {
        const link = document.createElement('a');
        link.download = 'avatar.png';
        link.href = URL.createObjectURL(blob);
        link.click();
      });
    });
  };
  first.onerror = () => alert("Failed to load image.");
  first.src = srcs[0];
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
  loadAssetConfig();
});

// Leaf animation remains unchanged...

    
    // Falling leaf animation
    function createLeaf() {
      const leaf = document.createElement('div');
      leaf.classList.add('leaf');
      leaf.style.left = Math.random() * window.innerWidth + 'px';
      leaf.style.animationDuration = (5 + Math.random() * 5) + 's';
      leaf.style.animationDelay = Math.random() * 5 + 's';
      document.body.appendChild(leaf);
    }
    
    // Spawn initial leaves
    for (let i = 0; i < 15; i++) {
      createLeaf();
    }
    
    // Maintain leaf count
    setInterval(() => {
      if (document.querySelectorAll('.leaf').length < 30) {
          createLeaf();
      }
    }, 1000);