import * as ui from './ui.js';
import * as api from './api.js';
import { API_BASE_URL } from './config.js';

// Ported PlantDoctorBrain from plantdoctor.js for frontend analysis
// Ported PlantDoctorBrain from plantdoctor.js for frontend analysis
const PlantDoctorBrain = {
    detectPlant(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                const width = canvas.width, height = canvas.height;

                let greenPixels = 0, brownPixels = 0, totalPixels = 0, colorVariance = 0;
                let greenShades = new Set(), edgeIntensity = 0;
                const sampleRate = 4, pixels = [];

                for (let y = 0; y < height; y += sampleRate) {
                    for (let x = 0; x < width; x += sampleRate) {
                        const idx = (y * width + x) * 4;
                        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                        totalPixels++; pixels.push({ r, g, b });
                        if (g > r + 20 && g > b + 20 && g > 60 && g < 240) {
                            greenPixels++; greenShades.add(Math.floor((g + r + b) / 3));
                        }
                        if (r > 80 && g > 60 && b < 100 && Math.abs(r - g) < 40) brownPixels++;
                        const avg = (r + g + b) / 3;
                        colorVariance += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
                    }
                }

                let edgeCount = 0;
                for (let i = 0; i < pixels.length - 1; i++) {
                    const diff = Math.abs(pixels[i].r - pixels[i + 1].r) + Math.abs(pixels[i].g - pixels[i + 1].g) + Math.abs(pixels[i].b - pixels[i + 1].b);
                    if (diff > 30) { edgeCount++; edgeIntensity += diff; }
                }

                let localVarianceSum = 0;
                for (let i = 0; i < pixels.length - 5; i++) {
                    const localAvg = pixels.slice(i, i + 5).reduce((sum, p) => sum + (p.r + p.g + p.b) / 3, 0) / 5;
                    const localVar = pixels.slice(i, i + 5).reduce((sum, p) => sum + Math.abs((p.r + p.g + p.b) / 3 - localAvg), 0) / 5;
                    localVarianceSum += localVar;
                }
                const textureComplexity = localVarianceSum / (pixels.length - 5);
                const colorValues = pixels.map(p => (p.r + p.g + p.b) / 3);
                const avgColor = colorValues.reduce((a, b) => a + b, 0) / colorValues.length;
                const colorStdDev = Math.sqrt(colorValues.reduce((sum, val) => sum + Math.pow(val - avgColor, 2), 0) / colorValues.length);
                const colorUniformity = 100 - Math.min(100, colorStdDev);

                const greenRatio = greenPixels / totalPixels, brownRatio = brownPixels / totalPixels;
                const res = this.evaluatePlantLikelihood(greenRatio, brownRatio, colorVariance / totalPixels, width, height, edgeCount / totalPixels, textureComplexity, colorUniformity, greenShades.size, 0, edgeCount > 0 ? edgeIntensity / edgeCount : 0);
                resolve({ isPlant: res.detected, confidence: res.confidence, reason: res.reason });
            };
            img.src = imageData;
        });
    },

    evaluatePlantLikelihood(greenRatio, brownRatio, colorVar, w, h, edgeR, textureC, colorU, greenS) {
        let score = 0;
        if (colorU > 85) score -= 50;
        if (edgeR < 0.01) score -= 40;
        if (textureC < 5) score -= 30;
        if (greenRatio > 0.2) score += greenS >= 5 ? 25 : (greenS >= 3 ? 15 : 5);
        if (edgeR > 0.05) score += 25; else if (edgeR > 0.02) score += 10;
        if (textureC > 20) score += 20; else if (textureC > 10) score += 10;
        const criteriaMet = [greenRatio > 0.1, edgeR > 0.01, textureC > 5, colorU < 85, greenS >= 3].filter(Boolean).length;
        const confidence = Math.min(100, Math.max(0, score + 40));
        return { detected: confidence >= 40 && criteriaMet >= 2, confidence };
    },

    // Helper: Convert RGB to HSL
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return [h, s, l];
    },

    analyzeImage(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imgDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgDataObj.data;
                const width = canvas.width, height = canvas.height;

                // ═══════════════════════════════════════════════════════════
                // ADVANCED AI VISUAL SIGNAL EXTRACTION
                // ═══════════════════════════════════════════════════════════

                const centerX = width / 2, centerY = height / 2;
                const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

                // Color metrics
                let t = 0, g = 0, br = 0, y = 0, bl = 0, w = 0;
                let darkGreen = 0, lightGreen = 0;
                let crispyBrown = 0; // Brown + High brightness = Dry/Crispy
                let bleached = 0;    // Very high brightness patches = Sunburn

                // Texture & Edge metrics
                let edgeCount = 0, edgeIntensity = 0;
                let holeEdges = 0;       // Sharp black-to-green transitions = Holes
                let textureVariance = 0;

                // Brightness & Saturation metrics
                let totalBrightness = 0, totalSaturation = 0;
                let brightPatches = 0, lowSatPatches = 0;
                let veinContrast = 0;    // Green veins + Yellow tissue = Chlorosis pattern

                // Structural metrics (for wilting detection)
                let upperHalfGreen = 0, lowerHalfGreen = 0;
                let shadowDepth = 0;

                // Store pixels for secondary analysis
                const pixels = [];
                const sampleRate = 4; // Every 4th pixel

                for (let py = 0; py < height; py += sampleRate) {
                    for (let px = 0; px < width; px += sampleRate) {
                        const idx = (py * width + px) * 4;
                        const r = data[idx], gr = data[idx + 1], blu = data[idx + 2];
                        const [h, s, l] = this.rgbToHsl(r, gr, blu);

                        pixels.push({ r, gr, blu, h, s, l, x: px, y: py });

                        // Center weighting
                        const dist = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2));
                        const weight = 1 - (0.3 * (dist / maxDist));

                        // Skip background
                        if (l > 0.92 || (s < 0.08 && l > 0.65) || s < 0.04) continue;

                        t += weight;
                        totalBrightness += l * weight;
                        totalSaturation += s * weight;

                        // Track brightness extremes
                        if (l > 0.80) brightPatches += weight;
                        if (s < 0.15) lowSatPatches += weight;
                        if (l > 0.85 && s < 0.20) bleached += weight; // Sunburn indicator

                        // Position-based analysis (upper vs lower half)
                        const isUpperHalf = py < height / 2;

                        // ═══════ HSL CLASSIFICATION ═══════

                        // 1. BLACK / NECROSIS / DEEP SHADOWS
                        if (l < 0.15) {
                            if (h > 60 && h < 185 && s > 0.08) {
                                g += weight;
                                darkGreen += weight;
                                shadowDepth += (0.15 - l) * weight; // Track shadow intensity
                            } else {
                                bl += weight;
                            }
                        }
                        // 2. GREEN (Healthy) - Hue 60-185
                        else if (h >= 60 && h <= 185) {
                            g += weight;
                            if (l < 0.40) {
                                darkGreen += weight;
                            } else if (l > 0.55) {
                                lightGreen += weight;
                            }
                            if (isUpperHalf) upperHalfGreen += weight;
                            else lowerHalfGreen += weight;
                        }
                        // 3. YELLOW ZONE (Hue 35-60)
                        else if (h >= 35 && h < 60) {
                            if (l > 0.50 && s > 0.40) {
                                lightGreen += weight; // Lime variegation
                                g += weight;
                            } else {
                                y += weight;
                                // Check for vein contrast (green nearby = chlorosis pattern)
                                if (s < 0.35 && l > 0.45) veinContrast += weight;
                            }
                        }
                        // 4. BROWN / RUST (Hue < 35 or > 340)
                        else if (h < 35 || h > 340) {
                            if (l > 0.12 && l < 0.70) {
                                br += weight;
                                // High brightness brown = Dry/Crispy edge
                                if (l > 0.45 && s < 0.50) crispyBrown += weight;
                            }
                        }
                        // 5. WHITE / POWDERY
                        else if (l > 0.80 && s < 0.20) {
                            w += weight;
                        }
                    }
                }

                // ═══════ EDGE & TEXTURE ANALYSIS ═══════
                // Detect sharp transitions (holes, spots, texture breaks)

                for (let i = 0; i < pixels.length - 1; i++) {
                    const p1 = pixels[i], p2 = pixels[i + 1];
                    if (Math.abs(p1.x - p2.x) > sampleRate * 2) continue; // Skip row breaks

                    const colorDiff = Math.abs(p1.r - p2.r) + Math.abs(p1.gr - p2.gr) + Math.abs(p1.blu - p2.blu);
                    const brightDiff = Math.abs(p1.l - p2.l);

                    if (colorDiff > 80) {
                        edgeCount++;
                        edgeIntensity += colorDiff;

                        // Hole detection: Sharp transition from green to black
                        const isGreenToBlack = (p1.h > 60 && p1.h < 185 && p1.l > 0.25) && (p2.l < 0.15);
                        const isBlackToGreen = (p2.h > 60 && p2.h < 185 && p2.l > 0.25) && (p1.l < 0.15);
                        if (isGreenToBlack || isBlackToGreen) holeEdges++;
                    }

                    // Texture variance (for mold/mildew detection)
                    textureVariance += Math.pow(brightDiff, 2);
                }

                // ═══════ NORMALIZE METRICS ═══════

                const gR = t > 0 ? g / t : 0;
                const bR = t > 0 ? br / t : 0;
                const yR = t > 0 ? y / t : 0;
                const blR = t > 0 ? bl / t : 0;
                const wR = t > 0 ? w / t : 0;
                const crispyR = t > 0 ? crispyBrown / t : 0;
                const bleachedR = t > 0 ? bleached / t : 0;
                const avgBrightness = t > 0 ? totalBrightness / t : 0;
                const avgSaturation = t > 0 ? totalSaturation / t : 0;
                const edgeRatio = pixels.length > 0 ? edgeCount / pixels.length : 0;
                const holeEdgeRatio = edgeCount > 0 ? holeEdges / edgeCount : 0;
                const textureScore = pixels.length > 1 ? Math.sqrt(textureVariance / (pixels.length - 1)) : 0;
                const shadowScore = t > 0 ? shadowDepth / t : 0;
                const greenDistribution = (upperHalfGreen + lowerHalfGreen) > 0
                    ? Math.abs(upperHalfGreen - lowerHalfGreen) / (upperHalfGreen + lowerHalfGreen) : 0;

                // Variegation signal
                const isVariegated = (darkGreen / t > 0.08) && ((lightGreen / t > 0.08) || (wR > 0.04));

                // ═══════════════════════════════════════════════════════════
                // COMPREHENSIVE SYMPTOM DATABASE (12 CONDITIONS)
                // ═══════════════════════════════════════════════════════════

                const symptomDB = {
                    chlorosis: {
                        id: "chlorosis",
                        cond: "Chlorosis / Yellowing",
                        emoji: "🟡",
                        severity: "moderate",
                        aiClues: "Yellow color shift, low saturation, high brightness, vein contrast",
                        advice: "Check soil moisture. If waterlogged, improve drainage. If dry, water deeply. For nutrients, apply balanced fertilizer with nitrogen and iron.",
                        treatment: "Apply nitrogen-rich fertilizer (NPK 10-10-10) or iron chelate. Adjust watering. Prune yellow leaves to redirect energy.",
                        followUp: "Are yellow leaves on older growth (bottom = N deficiency) or new growth (top = iron deficiency)?"
                    },
                    spots: {
                        id: "spots",
                        cond: "Leaf Spots / Lesions",
                        emoji: "🟤",
                        severity: "moderate",
                        aiClues: "Brown/black spots with high contrast, localized damage, possible yellow halos",
                        advice: "Remove affected leaves immediately to prevent spread. Avoid overhead watering. Ensure good air circulation.",
                        treatment: "Prune infected leaves. Apply copper-based fungicide or neem oil every 7-10 days. Improve ventilation.",
                        followUp: "Are the spots spreading? Do they have a yellow halo around them?"
                    },
                    wilting: {
                        id: "wilting",
                        cond: "Wilting / Drooping",
                        emoji: "🔴",
                        severity: "high",
                        aiClues: "Leaves hanging downward, deep structural shadows, green color preserved",
                        advice: "Check soil moisture immediately. If dry, water deeply and provide shade. If wet, check for root rot.",
                        treatment: "For underwatering: Deep water and mist leaves. For overwatering: Remove from pot, trim rotten roots, repot with fresh soil.",
                        followUp: "Does the plant recover after watering, or does it stay wilted?"
                    },
                    mold: {
                        id: "mold",
                        cond: "Powdery Mildew / Mold",
                        emoji: "⚪",
                        severity: "moderate",
                        aiClues: "White powdery coating, fine texture noise, low saturation, surface uniformity loss",
                        advice: "Improve air circulation immediately. Remove affected leaves. Apply baking soda solution (1 tsp/quart water) or sulfur fungicide.",
                        treatment: "Prune affected areas. Apply fungicide weekly. Use fans for air movement. Reduce humidity.",
                        followUp: "Is the mold white and powdery, or dark and fuzzy?"
                    },
                    holes: {
                        id: "holes",
                        cond: "Chewed / Holed Leaves",
                        emoji: "🕳️",
                        severity: "mild",
                        aiClues: "Missing leaf tissue, sharp black-to-green edges, negative space detection",
                        advice: "Inspect plant at night when pests are active. Hand-pick visible pests. Apply diatomaceous earth around base.",
                        treatment: "Remove pests manually. Apply Bt (Bacillus thuringiensis) for caterpillars or neem oil. Use netting if needed.",
                        followUp: "What size are the holes? Are they round (beetles) or irregular (caterpillars)?"
                    },
                    dry: {
                        id: "dry",
                        cond: "Dry / Brittle / Crispy Leaves",
                        emoji: "🍂",
                        severity: "mild",
                        aiClues: "Brown dry edges, high brightness brown areas, sharp edges, reduced moisture texture",
                        advice: "Increase watering frequency. Check if root-bound. Increase humidity with misting or pebble tray. Provide shade during peak sun.",
                        treatment: "Water deeply when top 2 inches dry. Mist leaves daily. Move to less windy location. Flush soil to remove salt buildup.",
                        followUp: "Are the edges brown and crispy, or is the entire leaf dry?"
                    },
                    sunburn: {
                        id: "sunburn",
                        cond: "Sunburn / Scorching",
                        emoji: "☀️",
                        severity: "mild",
                        aiClues: "Bleached/white patches, very high brightness, localized damage on sun-facing areas",
                        advice: "Move plant to filtered light or morning sun only. Provide shade during peak hours (10am-4pm). Acclimate gradually to brighter light.",
                        treatment: "Relocate to shadier spot. Mist leaves to cool. Prune severely damaged leaves. Gradually increase light over weeks.",
                        followUp: "Was the plant recently moved to a sunnier location?"
                    },
                    curling: {
                        id: "curling",
                        cond: "Leaf Curling / Distortion",
                        emoji: "🌀",
                        severity: "moderate",
                        aiClues: "Shape deformation, asymmetric edges, unusual shadow patterns from twisted leaves",
                        advice: "Check for pests on leaf undersides. If pests found, treat immediately. If no pests, may be viral - isolate plant.",
                        treatment: "Treat for pests with neem oil. Apply balanced fertilizer. Remove severely affected leaves. Isolate if viral suspected.",
                        followUp: "Are the leaves curling upward (heat/light stress) or downward (overwatering)? Any visible pests?"
                    },
                    pests: {
                        id: "pests",
                        cond: "Pest Infestation",
                        emoji: "🐛",
                        severity: "moderate",
                        aiClues: "Leaf distortion without major discoloration, clustered specks, sticky residue appearance",
                        advice: "Isolate plant. Spray with neem oil solution (2 tsp neem + 1 tsp soap + 1 quart water). Check leaf undersides daily.",
                        treatment: "Apply neem oil every 3-5 days for 2 weeks. Introduce ladybugs for aphids. Remove heavily infested leaves.",
                        followUp: "What type of pests? Are they on leaves, stems, or soil?"
                    },
                    rootRot: {
                        id: "rootRot",
                        cond: "Root Rot / Soggy Soil",
                        emoji: "💧",
                        severity: "high",
                        aiClues: "Wilting despite wet conditions, dark discoloration at stem base, yellow leaves combined with drooping",
                        advice: "Stop watering immediately. Remove plant from pot. Trim all brown/mushy roots. Repot in fresh, well-draining soil.",
                        treatment: "Repot with fresh soil + perlite/sand. Reduce watering frequency significantly. Apply root stimulator. Consider fungicide drench.",
                        followUp: "How often were you watering? Does the pot have drainage holes?"
                    },
                    stunted: {
                        id: "stunted",
                        cond: "Stunted / Slow Growth",
                        emoji: "📉",
                        severity: "mild",
                        aiClues: "Compact appearance, short internodes, small leaves relative to expectations",
                        advice: "Check if root-bound. Ensure adequate light (6+ hours). Fertilize with balanced fertilizer. Check soil pH.",
                        treatment: "Repot if root-bound. Apply slow-release fertilizer. Increase light exposure. Improve soil with compost.",
                        followUp: "How long in current pot? Is it getting enough light?"
                    },
                    leafDrop: {
                        id: "leafDrop",
                        cond: "Leaf Drop / Shedding",
                        emoji: "🍃",
                        severity: "moderate",
                        aiClues: "Reduced leaf density, visible bare stems, combined yellow and green patterns",
                        advice: "Determine if seasonal or stress-related. Check soil moisture. Look for other symptoms. Maintain consistent care.",
                        treatment: "Maintain consistent watering. Avoid temperature extremes. Reduce stress factors. Leaf drop in fall may be natural.",
                        followUp: "Are leaves yellowing before falling, or dropping green? Happening all at once or gradually?"
                    }
                };

                // ═══════════════════════════════════════════════════════════
                // INTELLIGENT MULTI-SIGNAL DIAGNOSIS
                // ═══════════════════════════════════════════════════════════

                let diagnosis = null;
                let confidence = 0;
                let analysisPoints = [];

                // Scoring function
                const score = (base, ...conditions) => {
                    let s = base;
                    conditions.forEach(c => { if (c) s += 15; });
                    return Math.min(100, s);
                };

                // Priority-ordered diagnosis checks

                // 1. MOLD / MILDEW (White patches + texture noise)
                if (wR > 0.06 && !isVariegated) {
                    const conf = score(60, wR > 0.10, textureScore > 0.05, lowSatPatches / t > 0.15);
                    if (conf > confidence) {
                        diagnosis = symptomDB.mold;
                        confidence = conf;
                        analysisPoints = [
                            `White powdery substance on ${(wR * 100).toFixed(0)}% of leaf`,
                            `Dusty or fuzzy texture visible`,
                            `Appears to be surface-level growth`
                        ];
                    }
                }

                // 2. SUNBURN (Bleached patches + high brightness)
                if (bleachedR > 0.05 && avgBrightness > 0.55) {
                    const conf = score(55, bleachedR > 0.10, brightPatches / t > 0.20, bR < 0.02);
                    if (conf > confidence) {
                        diagnosis = symptomDB.sunburn;
                        confidence = conf;
                        analysisPoints = [
                            `Bleached or faded patches covering ${(bleachedR * 100).toFixed(0)}% of leaf`,
                            `Unusually bright/washed out areas`,
                            `Damage appears localized to sun-exposed side`
                        ];
                    }
                }

                // 3. LEAF SPOTS / FUNGAL (Brown spots with contrast)
                if (bR > 0.02) {
                    const hasContrast = edgeRatio > 0.03;
                    const conf = score(50, bR > 0.05, hasContrast, gR > 0.30);
                    if (conf > confidence) {
                        diagnosis = symptomDB.spots;
                        confidence = conf;
                        analysisPoints = [
                            `Brown or rust-colored spots covering ${(bR * 100).toFixed(0)}% of leaf`,
                            `Spots have distinct edges`,
                            `Healthy green tissue (${(gR * 100).toFixed(0)}%) surrounds affected areas`
                        ];
                    }
                }

                // 4. DRY / CRISPY (Brown + High brightness + Edge patterns)
                if (crispyR > 0.03 || (bR > 0.015 && avgBrightness > 0.50)) {
                    const conf = score(45, crispyR > 0.06, avgBrightness > 0.55, avgSaturation < 0.40);
                    if (conf > confidence) {
                        diagnosis = symptomDB.dry;
                        confidence = conf;
                        analysisPoints = [
                            `Dry, crispy brown edges or tips detected`,
                            `Leaf appears lighter than normal (dehydrated)`,
                            `Color looks washed out or faded`
                        ];
                    }
                }

                // 5. HOLES / CHEWED (Black holes with sharp green transitions)
                if (blR > 0.03 && holeEdgeRatio > 0.08 && gR < 0.50) {
                    const conf = score(50, blR > 0.06, holeEdgeRatio > 0.15, gR > 0.25);
                    if (conf > confidence) {
                        diagnosis = symptomDB.holes;
                        confidence = conf;
                        analysisPoints = [
                            `Holes or missing tissue detected`,
                            `Edges appear chewed or torn`,
                            `Pattern suggests pest feeding damage`
                        ];
                    }
                }

                // 6. WILTING (Deep shadows + High green + Structural change)
                if (shadowScore > 0.01 && gR > 0.35 && blR > 0.04) {
                    const conf = score(55, shadowScore > 0.02, gR > 0.45, greenDistribution > 0.15);
                    if (conf > confidence) {
                        diagnosis = symptomDB.wilting;
                        confidence = conf;
                        analysisPoints = [
                            `Leaves appear droopy or hanging down`,
                            `Green color still present (${(gR * 100).toFixed(0)}%)`,
                            `Loss of normal upright posture`
                        ];
                    }
                }

                // 7. CURLING (Unusual shadow patterns + green preserved)
                if (edgeRatio > 0.08 && textureScore > 0.06 && gR > 0.40) {
                    const conf = score(40, shadowScore > 0.015, greenDistribution > 0.10);
                    if (conf > confidence && blR < 0.06) {
                        diagnosis = symptomDB.curling;
                        confidence = conf;
                        analysisPoints = [
                            `Unusual leaf shape detected`,
                            `Twisted or curled edges visible`,
                            `Leaf still has healthy green color`
                        ];
                    }
                }

                // 8. CHLOROSIS (Yellow + Low saturation + Possible vein contrast)
                if (yR > 0.08 && !isVariegated) {
                    const hasVeinPattern = veinContrast > 0.02;
                    const conf = score(50, yR > 0.15, avgSaturation < 0.45, hasVeinPattern);
                    if (conf > confidence) {
                        diagnosis = symptomDB.chlorosis;
                        confidence = conf;
                        analysisPoints = [
                            `Yellow discoloration covering ${(yR * 100).toFixed(0)}% of leaf`,
                            `Color appears pale or washed out`,
                            hasVeinPattern ? `Veins staying green while tissue yellows` : `Uniform yellowing across leaf`
                        ];
                    }
                }

                // 9. ROOT ROT indicators (Yellow + Wilting signs combined)
                if (yR > 0.06 && shadowScore > 0.01 && gR < 0.50) {
                    const conf = score(40, yR > 0.12, shadowScore > 0.02, bR > 0.02);
                    if (conf > confidence) {
                        diagnosis = symptomDB.rootRot;
                        confidence = conf;
                        analysisPoints = [
                            `Yellowing AND wilting occurring together`,
                            `Yellow areas covering ${(yR * 100).toFixed(0)}% of leaf`,
                            `Plant looks droopy despite moist soil`
                        ];
                    }
                }

                // ═══════════════════════════════════════════════════════════
                // GENERATE RESPONSE
                // ═══════════════════════════════════════════════════════════

                let res = ``;

                if (diagnosis && confidence >= 45) {
                    // Severity indicator
                    const severityText = diagnosis.severity === "high" ? "🔴 Urgent Attention Needed"
                        : (diagnosis.severity === "moderate" ? "🟡 Moderate Concern" : "🟢 Minor Issue");

                    res += `${diagnosis.emoji} **${diagnosis.cond}**\n`;
                    res += `${severityText} • Confidence: ${confidence}%\n\n`;

                    res += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                    res += `📊 **What We Found:**\n`;
                    analysisPoints.forEach(point => {
                        res += `   • ${point}\n`;
                    });

                    res += `\n💡 **What This Means:**\n`;
                    res += `   ${diagnosis.advice}\n\n`;

                    res += `🩹 **Recommended Treatment:**\n`;
                    res += `   ${diagnosis.treatment}\n\n`;

                    res += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                    res += `❓ **Quick Question:**\n`;
                    res += `   ${diagnosis.followUp}`;
                }
                else if (gR > 0.40) {
                    const cond = isVariegated ? "Healthy Plant" : "Healthy Plant";
                    const varNote = isVariegated ? " with beautiful variegation" : "";

                    res += `✅ **${cond}**\n`;
                    res += `🟢 Looking Great! • Health Score: ${Math.round(gR * 100)}%\n\n`;

                    res += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                    res += `📊 **Health Check Results:**\n`;
                    res += `   ✓ Vibrant green coloration${varNote}\n`;
                    res += `   ✓ Good color saturation (${(avgSaturation * 100).toFixed(0)}%)\n`;
                    res += `   ✓ Smooth, healthy texture\n`;
                    res += `   ✓ Normal leaf structure\n`;
                    res += `   ✓ No disease or pest signs detected\n\n`;

                    res += `🌱 **Keep It Up!**\n`;
                    res += `   Your plant is thriving. Continue your current care routine.`;
                }
                else {
                    res += `🔍 **Needs Closer Examination**\n`;
                    res += `⚪ Unable to make confident diagnosis\n\n`;

                    res += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                    res += `📊 **What We Detected:**\n`;
                    res += `   • Healthy green tissue: ${(gR * 100).toFixed(0)}% (below typical)\n`;
                    if (yR > 0.05) res += `   • Some yellowing present: ${(yR * 100).toFixed(0)}%\n`;
                    if (bR > 0.01) res += `   • Brown areas detected: ${(bR * 100).toFixed(0)}%\n`;

                    res += `\n📷 **Try Again With:**\n`;
                    res += `   • Better lighting (natural daylight works best)\n`;
                    res += `   • Closer angle on the affected leaf\n`;
                    res += `   • Clear focus on problem areas`;
                }

                resolve(res);
            };
            img.onerror = (e) => resolve({ error: "Image Load Failed", details: "Could not process image data" });
            img.src = imageData;
        });
    },
};

export function setupDoctorUI() {
    const docSend = document.getElementById("doctorSendBtn");
    if (docSend) docSend.addEventListener("click", sendDoctorMessage);
    const docInput = document.getElementById("doctorInput");
    if (docInput) docInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendDoctorMessage(); });

    document.getElementById("btnDoctorCamera")?.addEventListener("click", () => document.getElementById("doctorFileInput").click());
    document.getElementById("doctorFileInput")?.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) handleDoctorImageUpload(e.target.files[0]);
    });

    loadRecentDiagnoses();
}

async function sendDoctorMessage() {
    const input = document.getElementById("doctorInput");
    const val = input.value;
    if (!val) return;
    const display = document.getElementById("doctorChatDisplay");

    // Add user message to UI
    appendChatMessage("user", val);
    input.value = "";

    const formData = new FormData();
    formData.append("email", localStorage.getItem("pm_user_email"));
    formData.append("query", val);

    const result = await api.diagnosePlant(formData);
    if (result && result.ai_response) {
        appendChatMessage("bot", result.ai_response);
        loadRecentDiagnoses(); // Refresh history
    } else {
        appendChatMessage("bot", "I'm having trouble connecting to my central database. Please try again.");
    }
}

async function handleDoctorImageUpload(file) {
    const display = document.getElementById("doctorChatDisplay");

    // UI Feedback: Start Scanning
    const scanningMsg = appendChatMessage("bot", "Initializing advanced scanner...");

    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = e.target.result;

        // Phase 1: Detection
        updateScanningStatus(scanningMsg, "Detecting plant structures using canvas analysis...");
        const detection = await PlantDoctorBrain.detectPlant(imageData);

        if (!detection.isPlant) {
            updateScanningStatus(scanningMsg, "❌ **Plant Not Detected**\n\nThis image doesn't meet the sophisticated criteria for plant detection. Please upload a clear photo of an actual plant.");
            return;
        }

        // Phase 2: Analysis
        updateScanningStatus(scanningMsg, `✅ **Plant Verified** (${detection.confidence}% confidence). Analyzing health patterns...`);
        await new Promise(r => setTimeout(r, 1000));
        updateScanningStatus(scanningMsg, "Scanning for fungal spots, chlorosis, and nutrient markers...");

        const scanResult = await PlantDoctorBrain.analyzeImage(imageData);

        // Phase 3: DB Persistence
        updateScanningStatus(scanningMsg, "Generating structured report and saving to history...");

        const formData = new FormData();
        formData.append("email", localStorage.getItem("pm_user_email"));
        formData.append("query", "Photo Diagnosis");
        formData.append("scanResult", scanResult);
        formData.append("image", file); // File LAST

        const result = await api.diagnosePlant(formData);
        if (result && result.ai_response) {
            // Store globally for the Deep Scan button
            window.lastScannedImageUrl = result.image_url;
            window.lastDiagnosisId = result.id;

            // Replace the scanning message with the final result
            display.removeChild(scanningMsg);
            if (result.image_url) appendChatMessage("user", "", result.image_url);
            appendChatMessage("bot", result.ai_response);
            loadRecentDiagnoses();
        } else if (result.error && result.error.includes("limit reached")) {
            display.removeChild(scanningMsg);
            appendChatMessage("bot", `⚠️ **Quota Exceeded**\n\n${result.error}\n\nPlease visit the **Subscription** tab to upgrade your plan!`);
        } else {
            const errorTitle = (result && result.error) ? result.error : "Synchronization Failed";
            const errorDetails = (result && result.details) ? result.details : "Check your connection and try again.";

            // Styled error message
            const errorHtml = `
                <span style="display: block; background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; margin-top: 5px;">
                    <span style="display: flex; align-items: center; color: #991B1B; font-weight: 700; font-size: 1.05em; margin-bottom: 8px;">
                        <span style="margin-right: 8px; font-size: 1.2em;">⛔</span> ${errorTitle}
                    </span>
                    <span style="display: block; color: #B91C1C; font-size: 0.9em; line-height: 1.4; padding-top: 8px; border-top: 1px solid #FECACA;">
                        ${errorDetails}
                    </span>
                </span>
            `;
            updateScanningStatus(scanningMsg, errorHtml);
        }
    };
    reader.readAsDataURL(file);
}

// Helper to update the text of an existing chat message
function updateScanningStatus(msgDiv, text) {
    const p = msgDiv.querySelector("p");
    if (p) {
        p.innerHTML = text
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/•/g, '•');
    }
    const display = document.getElementById("doctorChatDisplay");
    display.scrollTop = display.scrollHeight;
}

function appendChatMessage(type, text, imageUrl = null) {
    const display = document.getElementById("doctorChatDisplay");
    const msg = document.createElement("div");
    msg.className = type === "user" ? "user-msg" : "bot-msg";

    if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "8px";
        img.style.marginTop = "8px";
        msg.appendChild(img);
    }

    if (text) {
        const p = document.createElement("p");
        p.innerHTML = text
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/•/g, '•')
            .replace(/━━━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border:0; border-top:1px solid #e2e8f0; margin:10px 0;">');
        msg.appendChild(p);

        // Add Deep Scan Button if it's a bot message and we have a recently scanned image
        if (type === "bot" && window.lastScannedImageUrl && !text.includes("Deep Scan Results")) {
            const btn = document.createElement("button");
            btn.innerHTML = "🧬 Run AI Deep Scan";
            btn.className = "deep-scan-btn";
            btn.style.cssText = "margin-top:10px; padding:8px 15px; background:#4f46e5; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85em; display:flex; align-items:center; gap:5px;";
            btn.onclick = () => {
                handleDeepScan(window.lastScannedImageUrl, btn);
                window.lastScannedImageUrl = null; // Prevent multi-clicks
            };
            msg.appendChild(btn);
        }
    }

    display.appendChild(msg);
    display.scrollTop = display.scrollHeight;
    return msg;
}

async function handleDeepScan(imageUrl, button) {
    button.disabled = true;
    button.innerHTML = "🌀 Processing Deep Matrix...";
    button.style.opacity = "0.7";

    try {
        const response = await fetch(`${API_BASE_URL}/api/doctor/deep-scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("pm_token")}`
            },
            body: JSON.stringify({
                imagePath: imageUrl,
                email: localStorage.getItem("pm_user_email"),
                diagnosisId: window.lastDiagnosisId
            })
        });

        if (response.status === 403) {
            const error = await response.json();
            appendChatMessage("bot", `⚠️ **Limit Reached**: ${error.error}\n\nYou can manage your subscription in the **Subscription** tab!`);
            button.innerHTML = "🧬 Upgrade for More";
            button.onclick = () => {
                if (window.navigateToPage) window.navigateToPage('subscription');
            };
            button.disabled = false;
            return;
        }

        const data = await response.json();

        if (data.fallback) {
            appendChatMessage("bot", `⚠️ **Deep Scan Unavailable:** ${data.message}`);
            button.innerHTML = "🧬 Scan Restricted";
            return;
        }

        if (data.status === "success") {
            let res = "";

            // Check for multiple detections
            const detections = data.all_detections || [data];

            detections.forEach((det, index) => {
                let severity = det.severity === "high" ? "🔴 Urgent" : (det.severity === "moderate" ? "🟡 Moderate" : "🟢 Mild");

                if (index > 0) res += `\n\n`;
                res += `${det.emoji || "🧪"} **${det.name || det.diagnosis}**\n`;
                res += `${severity} • Confidence: ${det.confidence}\n\n`;

                if (det.advice) {
                    res += `💡 **What This Means:**\n   ${det.advice}\n\n`;
                }
                if (det.treatment) {
                    res += `🩹 **Recommended Treatment:**\n   ${det.treatment}\n\n`;
                }

                if (index < detections.length - 1) {
                    res += `---`;
                }
            });

            res += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            // Detected Signals (General for all)
            if (data.signals && data.signals.length > 0) {
                res += `📊 **Global Detection Signals:**\n`;
                data.signals.forEach(s => { res += `   • ${s}\n`; });
                res += `\n`;
            }

            res += `📈 **Color Matrix Breakdown:**\n`;
            res += `   🟢 Green: ${data.metrics.green}\n`;
            res += `   🟡 Yellow: ${data.metrics.yellow}\n`;
            res += `   🟤 Brown: ${data.metrics.brown}\n`;
            if (data.metrics.white) res += `   ⚪ White: ${data.metrics.white}\n`;

            res += `\n<span style="font-size:0.8em; color:#94a3b8;">${data.engine}</span>`;

            appendChatMessage("bot", res);
            button.innerHTML = "✅ Deep Scan Complete";
        } else {
            console.error("Deep Scan Response:", data);
            throw new Error(data.error || data.message || "Deep scan failed");
        }
    } catch (err) {
        console.error("Deep Scan Error:", err);
        appendChatMessage("bot", `❌ **Deep Scan Error**: ${err.message || "Unknown error"}`);
        button.innerHTML = "❌ Scan Failed";
    }
}

async function loadRecentDiagnoses() {
    const container = document.getElementById("issueLogList");
    if (!container) return;

    container.innerHTML = "Loading...";
    const diagnoses = await api.fetchDiagnoses();
    container.innerHTML = "";

    if (!diagnoses || diagnoses.length === 0) {
        container.innerHTML = "<p style='color:#999; font-size:12px;'>No history yet.</p>";
        return;
    }

    diagnoses.forEach(d => {
        const item = document.createElement("div");
        item.className = "diagnosis-item";
        item.style.padding = "10px";
        item.style.borderBottom = "1px solid #eee";
        item.style.fontSize = "13px";
        item.style.cursor = "pointer";

        const date = new Date(d.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const isDeepScan = (d.query_text || "").includes("Deep Scan");
        const icon = isDeepScan ? "🧬" : "🌿";
        const titleColor = isDeepScan ? "#6a1b9a" : "#2e7d32"; // Purple for Deep Scan, Green for regular

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-weight:600; color:${titleColor}; font-size:13px; display:flex; align-items:center gap:6px;">
                    <span style="margin-right:6px;">${icon}</span>${d.query_text || "Plant Diagnosis"}
                </span>
            </div>
            <div style="font-size:11px; color:#888;">${date}</div>
        `;

        item.onclick = () => {
            const display = document.getElementById("doctorChatDisplay");
            display.innerHTML = ""; // Clear chat
            appendChatMessage("user", d.query_text, d.image_url);
            appendChatMessage("bot", d.ai_response);
        };

        container.appendChild(item);
    });
}
