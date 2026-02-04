// ===================================
// DOCTOR AI BRAIN - ADVANCED VERSION
// ===================================
const PlantDoctorBrain = {
    conversationHistory: [],
    currentContext: {
        plant: null,
        symptoms: [],
        severity: 'mild'
    },

    knowledgeBase: {
        symptoms: [
            {
                keywords: ["yellow", "yellowing", "chlorosis", "pale"],
                causes: ["Nitrogen deficiency", "Iron deficiency", "Overwatering", "Poor drainage", "Lack of sunlight", "Natural aging"],
                severity: "moderate",
                advice: "Check soil moisture first. If soil is waterlogged, improve drainage and reduce watering. If soil is dry, water deeply. For nutrient issues, apply a balanced fertilizer with nitrogen and iron. Ensure adequate sunlight exposure.",
                treatment: "Apply nitrogen-rich fertilizer (NPK 10-10-10) or iron chelate. Adjust watering schedule. Prune yellow leaves to redirect energy.",
                followUp: "Are the yellow leaves on older growth (bottom) or new growth (top)?"
            },
            {
                keywords: ["spots", "brown spots", "black spots", "lesions", "blotches"],
                causes: ["Fungal infection (leaf spot)", "Bacterial leaf spot", "Pest damage", "Sunburn", "Chemical burn"],
                severity: "moderate",
                advice: "Remove affected leaves immediately to prevent spread. Avoid overhead watering - water at the base. Apply copper-based fungicide or neem oil. Ensure good air circulation around the plant.",
                treatment: "Prune infected leaves. Apply organic fungicide (copper sulfate or neem oil) every 7-10 days. Improve ventilation.",
                followUp: "Are the spots spreading? Do they have a yellow halo around them?"
            },
            {
                keywords: ["wilting", "wilt", "drooping", "limp", "flaccid"],
                causes: ["Underwatering", "Overwatering/root rot", "Extreme heat", "Transplant shock", "Disease"],
                severity: "high",
                advice: "Check soil moisture immediately. If dry, water deeply and provide shade. If wet, stop watering and check roots for rot. If roots are brown and mushy, root rot is likely - repot with fresh soil.",
                treatment: "For underwatering: Deep water and mist leaves. For overwatering: Remove from pot, trim rotten roots, repot in well-draining soil. Add root stimulator.",
                followUp: "Does the plant recover after watering, or does it stay wilted?"
            },
            {
                keywords: ["bugs", "insects", "pests", "aphids", "ants", "mites", "scale", "mealybugs", "whiteflies"],
                causes: ["Pest infestation", "Weak plant defense", "Overcrowding"],
                severity: "moderate",
                advice: "Isolate the plant if possible. Spray with neem oil solution (2 tsp neem oil + 1 tsp mild soap + 1 quart water) or insecticidal soap. Check undersides of leaves daily. For severe infestations, consider systemic insecticide.",
                treatment: "Apply neem oil spray every 3-5 days for 2 weeks. Introduce beneficial insects like ladybugs. Remove heavily infested leaves.",
                followUp: "What type of pests are you seeing? Are they on the leaves, stems, or soil?"
            },
            {
                keywords: ["dry", "brittle", "crunchy", "crispy", "cracked"],
                causes: ["Low humidity", "Underwatering", "Sun scorch", "Salt buildup", "Wind damage"],
                severity: "mild",
                advice: "Increase watering frequency and check if the plant needs repotting (root-bound plants dry out quickly). Increase humidity by misting or using a pebble tray. Provide shade during peak sun hours.",
                treatment: "Water deeply when top 2 inches of soil are dry. Mist leaves daily. Move to less windy location. Flush soil to remove salt buildup.",
                followUp: "Are the edges brown and crispy, or is the entire leaf dry?"
            },
            {
                keywords: ["mold", "mildew", "powdery", "white film", "fuzzy"],
                causes: ["Powdery mildew", "Downy mildew", "High humidity", "Poor air circulation"],
                severity: "moderate",
                advice: "Improve air circulation immediately. Remove affected leaves. Apply baking soda solution (1 tsp baking soda + 1 quart water) or sulfur-based fungicide. Reduce humidity around the plant.",
                treatment: "Prune affected areas. Apply fungicide weekly. Increase spacing between plants. Use fans for air movement.",
                followUp: "Is the mold white and powdery, or dark and fuzzy?"
            },
            {
                keywords: ["holes", "chewed", "eaten", "damaged leaves"],
                causes: ["Caterpillars", "Slugs/snails", "Beetles", "Deer/rabbits"],
                severity: "mild",
                advice: "Inspect plant at night when many pests are active. Hand-pick visible pests. Apply diatomaceous earth around base. Use organic pesticides like Bt (Bacillus thuringiensis) for caterpillars.",
                treatment: "Remove pests manually. Apply organic pesticide. Use physical barriers (netting) if needed. Encourage natural predators.",
                followUp: "What size are the holes? Are they round or irregular?"
            },
            {
                keywords: ["stunted", "slow growth", "not growing", "small"],
                causes: ["Nutrient deficiency", "Root-bound", "Insufficient light", "Poor soil quality", "Overwatering"],
                severity: "mild",
                advice: "Check if plant needs repotting (roots coming out of drainage holes). Ensure adequate light (most plants need 6+ hours). Fertilize with balanced fertilizer. Check soil pH.",
                treatment: "Repot if root-bound. Apply slow-release fertilizer. Increase light exposure. Improve soil quality with compost.",
                followUp: "How long has the plant been in its current pot? Is it getting enough light?"
            },
            {
                keywords: ["falling", "dropping", "shedding", "losing leaves"],
                causes: ["Natural seasonal drop", "Overwatering", "Underwatering", "Shock", "Disease"],
                severity: "moderate",
                advice: "Determine if it's natural (seasonal) or stress-related. Check soil moisture. Look for other symptoms. Ensure consistent care and avoid sudden changes.",
                treatment: "Maintain consistent watering. Avoid temperature extremes. Reduce stress factors. For deciduous plants, leaf drop in fall is normal.",
                followUp: "Are leaves yellowing before falling, or dropping green? Is this happening all at once or gradually?"
            },
            {
                keywords: ["curling", "twisted", "distorted", "deformed"],
                causes: ["Pest damage (aphids, mites)", "Virus", "Herbicide damage", "Nutrient deficiency"],
                severity: "moderate",
                advice: "Check for pests on undersides of leaves. If pests found, treat immediately. If no pests, may be viral - isolate plant. Check for chemical exposure.",
                treatment: "Treat for pests with neem oil. Apply balanced fertilizer. Remove severely affected leaves. Isolate if viral suspected.",
                followUp: "Are the leaves curling upward or downward? Are there any visible pests?"
            },
            {
                keywords: ["root rot", "mushy roots", "smelly soil", "soggy"],
                causes: ["Overwatering", "Poor drainage", "Fungal infection"],
                severity: "high",
                advice: "Stop watering immediately. Remove plant from pot. Trim all brown/mushy roots. Repot in fresh, well-draining soil. Water sparingly until recovery.",
                treatment: "Repot with fresh soil. Improve drainage (add perlite/sand). Reduce watering frequency. Apply root stimulator. Consider fungicide drench.",
                followUp: "How often were you watering? Does the pot have drainage holes?"
            },
            {
                keywords: ["burn", "scorched", "bleached", "sunburn"],
                causes: ["Too much direct sunlight", "Reflected heat", "Sudden exposure"],
                severity: "mild",
                advice: "Move plant to location with filtered light or morning sun only. Provide shade during peak hours (10am-4pm). Gradually acclimate to brighter light.",
                treatment: "Relocate to shadier spot. Mist leaves to cool. Prune severely damaged leaves. Gradually increase light exposure over weeks.",
                followUp: "Was the plant recently moved to a sunnier location?"
            }
        ],

        plantTypes: {
            "oak": { waterNeeds: "moderate", lightNeeds: "full sun", commonIssues: ["oak wilt", "powdery mildew"] },
            "pine": { waterNeeds: "low", lightNeeds: "full sun", commonIssues: ["pine beetles", "needle cast"] },
            "maple": { waterNeeds: "moderate", lightNeeds: "partial shade", commonIssues: ["tar spot", "anthracnose"] },
            "tree": { waterNeeds: "moderate", lightNeeds: "varies", commonIssues: ["general tree diseases"] }
        }
    },

    analyze(text) {
        const input = text.toLowerCase();
        this.conversationHistory.push({ role: 'user', text: text });

        // Update context from conversation
        this.updateContext(input);

        let response = "";
        let matches = [];
        let confidence = 0;

        // Enhanced pattern matching - check all symptoms
        this.knowledgeBase.symptoms.forEach(s => {
            const matchCount = s.keywords.filter(k => input.includes(k)).length;
            if (matchCount > 0) {
                matches.push({ ...s, matchScore: matchCount });
                confidence += matchCount;
            }
        });

        // Sort matches by relevance
        matches.sort((a, b) => b.matchScore - a.matchScore);

        // Check Plant Context
        const mentionedPlant = this.findMentionedPlant(input);
        if (mentionedPlant) {
            this.currentContext.plant = mentionedPlant;
        }

        // Build intelligent response
        if (matches.length > 0) {
            const primaryMatch = matches[0];
            const secondaryMatches = matches.slice(1, 3);

            response = this.buildDiagnosisResponse(text, primaryMatch, secondaryMatches, mentionedPlant, confidence);
        } else if (this.isGreeting(input)) {
            response = this.buildGreetingResponse();
        } else if (mentionedPlant) {
            response = this.buildPlantInfoResponse(mentionedPlant);
        } else if (this.isQuestion(input)) {
            response = this.buildGeneralAdviceResponse(input);
        } else {
            response = this.buildClarificationResponse(input);
        }

        // Add context-aware follow-up
        if (matches.length > 0 && !response.includes("?")) {
            response += " " + matches[0].followUp;
        }

        // Store in conversation history
        this.conversationHistory.push({ role: 'assistant', text: response });

        // Limit history to last 10 exchanges
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }

        return response;
    },

    updateContext(input) {
        // Extract symptoms from conversation
        this.knowledgeBase.symptoms.forEach(s => {
            if (s.keywords.some(k => input.includes(k))) {
                if (!this.currentContext.symptoms.includes(s.keywords[0])) {
                    this.currentContext.symptoms.push(s.keywords[0]);
                }
            }
        });
    },

    findMentionedPlant(input) {
        return plantsData.find(p => {
            const plantName = p.name.toLowerCase();
            return input.includes(plantName) ||
                input.includes(plantName.split(' ')[0]) ||
                plantName.includes(input.split(' ')[0]);
        });
    },

    buildDiagnosisResponse(userText, primaryMatch, secondaryMatches, plant, confidence) {
        let response = "";

        // Severity indicator
        const severityEmoji = {
            "high": "🔴",
            "moderate": "🟡",
            "mild": "🟢"
        };

        response += `${severityEmoji[primaryMatch.severity] || "🟡"} Based on your description, I've identified a **${primaryMatch.severity}** severity issue.\n\n`;

        // Primary diagnosis
        response += `**Primary Concern:** ${primaryMatch.causes.slice(0, 2).join(" or ")}\n\n`;

        // If multiple symptoms detected
        if (secondaryMatches.length > 0) {
            response += `I also notice signs of: ${secondaryMatches.map(m => m.keywords[0]).join(", ")}. This suggests a compound issue.\n\n`;
        }

        // Advice
        response += `**Immediate Action:** ${primaryMatch.advice}\n\n`;

        // Treatment plan
        response += `**Treatment Plan:** ${primaryMatch.treatment}\n\n`;

        // Plant-specific context
        if (plant) {
            response += `**Context for ${plant.name}:** `;
            response += `Located at ${plant.location}, last watered ${plant.lastWatered}. `;
            if (plant.status !== 'healthy') {
                response += `Current status: ${plant.status}. `;
            }
            if (plant.soilType) {
                response += `Soil type: ${plant.soilType}. `;
            }
            response += `\n\n`;
        }

        // Weather context
        if (weatherData.current) {
            const temp = weatherData.current.temp;
            if (temp > 30) {
                response += `⚠️ **Weather Alert:** It's very hot today (${temp}°C). Ensure adequate hydration and consider providing shade.`;
            } else if (temp < 10) {
                response += `⚠️ **Weather Alert:** It's quite cold (${temp}°C). Protect sensitive plants from frost.`;
            }
        }

        return response;
    },

    buildGreetingResponse() {
        const greetings = [
            "Hello! I'm your advanced AI Plant Doctor. I can help diagnose plant issues, provide treatment plans, and answer care questions.",
            "Hi there! I'm here to help with all your plant health needs. Describe any symptoms you're seeing, or ask about specific plants.",
            "Greetings! I can analyze symptoms, identify diseases, recommend treatments, and provide personalized care advice. What can I help with today?"
        ];

        let response = greetings[Math.floor(Math.random() * greetings.length)];

        if (plantsData.length > 0) {
            response += `\n\nI see you have ${plantsData.length} plant${plantsData.length > 1 ? 's' : ''} in your system. Feel free to ask about any of them by name!`;
        }

        return response;
    },

    buildPlantInfoResponse(plant) {
        let response = `**${plant.name} Information:**\n\n`;
        response += `📍 Location: ${plant.location}\n`;
        response += `📊 Status: ${plant.status}\n`;
        response += `💧 Last Watered: ${plant.lastWatered}\n`;
        if (plant.size) response += `📏 Size: ${plant.size}\n`;
        if (plant.height) response += `📐 Height: ${plant.height}\n`;
        if (plant.soilType) response += `🌱 Soil: ${plant.soilType}\n`;

        response += `\n**What would you like to know?**\n`;
        response += `- Current health status\n`;
        response += `- Care recommendations\n`;
        response += `- Any specific symptoms you're noticing\n`;

        return response;
    },

    buildGeneralAdviceResponse(input) {
        const careKeywords = {
            "water": "Watering needs vary by plant type. Generally, water when the top 2 inches of soil are dry. Overwatering is more common than underwatering.",
            "fertilize": "Most plants benefit from fertilizing during growing season (spring/summer). Use balanced fertilizer (NPK 10-10-10) monthly, or slow-release every 3 months.",
            "light": "Light requirements vary: Full sun (6+ hours direct), Partial shade (3-6 hours), Full shade (indirect only). Check your plant's specific needs.",
            "repot": "Repot when roots fill the pot or emerge from drainage holes. Best done in spring. Use pot 1-2 inches larger with fresh, well-draining soil.",
            "prune": "Prune dead/damaged growth anytime. For shaping, prune in late winter/early spring before new growth. Always use clean, sharp tools."
        };

        for (const [key, advice] of Object.entries(careKeywords)) {
            if (input.includes(key)) {
                return advice;
            }
        }

        return "I'd be happy to help! Could you provide more specific details about what you'd like to know?";
    },

    buildClarificationResponse(input) {
        let response = "I want to help you accurately! Could you provide more details?\n\n";
        response += "**Please describe:**\n";
        response += "• What symptoms are you seeing? (color changes, spots, wilting, etc.)\n";
        response += "• Which part of the plant? (leaves, stems, roots, flowers)\n";
        response += "• When did you first notice this?\n";
        response += "• Any recent changes in care or environment?\n";

        if (weatherData.current && weatherData.current.temp > 28) {
            response += `\n💡 **Tip:** It's quite hot today (${weatherData.current.temp}°C), so heat stress could be a factor.`;
        }

        return response;
    },

    isGreeting(input) {
        return /^(hello|hi|hey|greetings|good morning|good afternoon|good evening)/i.test(input.trim());
    },

    isQuestion(input) {
        return input.includes("?") ||
            /^(what|how|when|where|why|can|should|do|does|is|are)/i.test(input.trim());
    },

    detectPlant(imageData) {
        // Advanced plant detection using sophisticated image analysis
        // Detects actual plants vs. solid colors, patterns, or non-plant images

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const width = canvas.width;
                const height = canvas.height;

                // Advanced analysis metrics
                let greenPixels = 0;
                let brownPixels = 0;
                let totalPixels = 0;
                let colorVariance = 0;
                let greenShades = new Set(); // Track different shades of green
                let edgeIntensity = 0;
                let textureComplexity = 0;
                let colorUniformity = 0;
                let structuralElements = 0;

                // Sample grid for analysis (every 4th pixel for better accuracy)
                const sampleRate = 4;
                const pixels = [];

                for (let y = 0; y < height; y += sampleRate) {
                    for (let x = 0; x < width; x += sampleRate) {
                        const idx = (y * width + x) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];

                        totalPixels++;
                        pixels.push({ r, g, b, x, y, idx });

                        // Detect green with stricter criteria
                        const isGreen = g > r + 20 && g > b + 20 && g > 60 && g < 240;
                        if (isGreen) {
                            greenPixels++;
                            // Track green shade variations (plants have multiple green tones)
                            const greenShade = Math.floor((g + r + b) / 3);
                            greenShades.add(greenShade);
                        }

                        // Detect brown/soil
                        const isBrown = r > 80 && g > 60 && b < 100 && Math.abs(r - g) < 40;
                        if (isBrown) brownPixels++;

                        // Calculate color variance
                        const avg = (r + g + b) / 3;
                        colorVariance += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
                    }
                }

                // Edge detection - plants have edges (leaves, stems)
                let edgeCount = 0;
                for (let i = 0; i < pixels.length - 1; i++) {
                    const p1 = pixels[i];
                    const p2 = pixels[i + 1];
                    const diff = Math.abs(p1.r - p2.r) + Math.abs(p1.g - p2.g) + Math.abs(p1.b - p2.b);
                    if (diff > 30) { // Significant color change = edge
                        edgeCount++;
                        edgeIntensity += diff;
                    }
                }

                // Texture analysis - plants have organic, non-uniform textures
                let localVarianceSum = 0;
                for (let i = 0; i < pixels.length - 5; i++) {
                    const localPixels = pixels.slice(i, i + 5);
                    const localAvg = localPixels.reduce((sum, p) => sum + (p.r + p.g + p.b) / 3, 0) / localPixels.length;
                    const localVar = localPixels.reduce((sum, p) => {
                        const val = (p.r + p.g + p.b) / 3;
                        return sum + Math.abs(val - localAvg);
                    }, 0) / localPixels.length;
                    localVarianceSum += localVar;
                }
                textureComplexity = localVarianceSum / (pixels.length - 5);

                // Color uniformity check - solid colors = not a plant
                const colorValues = pixels.map(p => (p.r + p.g + p.b) / 3);
                const avgColor = colorValues.reduce((a, b) => a + b, 0) / colorValues.length;
                const colorStdDev = Math.sqrt(
                    colorValues.reduce((sum, val) => sum + Math.pow(val - avgColor, 2), 0) / colorValues.length
                );
                colorUniformity = 100 - Math.min(100, colorStdDev); // Lower std dev = more uniform = less likely plant

                // Structural element detection - look for patterns that suggest leaves/stems
                // Check for color gradients and variations within green areas
                let greenVariation = 0;
                const greenPixelsList = pixels.filter(p => {
                    const isGreen = p.g > p.r + 20 && p.g > p.b + 20 && p.g > 60;
                    return isGreen;
                });

                if (greenPixelsList.length > 10) {
                    const greenValues = greenPixelsList.map(p => p.g);
                    const greenAvg = greenValues.reduce((a, b) => a + b, 0) / greenValues.length;
                    greenVariation = Math.sqrt(
                        greenValues.reduce((sum, val) => sum + Math.pow(val - greenAvg, 2), 0) / greenValues.length
                    );
                }

                // Calculate ratios
                const greenRatio = greenPixels / totalPixels;
                const brownRatio = brownPixels / totalPixels;
                const avgVariance = colorVariance / totalPixels;
                const edgeRatio = edgeCount / totalPixels;
                const greenShadeVariety = greenShades.size;
                const avgEdgeIntensity = edgeCount > 0 ? edgeIntensity / edgeCount : 0;

                // Detection heuristics with much stricter criteria
                const isPlant = this.evaluatePlantLikelihood(
                    greenRatio,
                    brownRatio,
                    avgVariance,
                    width,
                    height,
                    edgeRatio,
                    textureComplexity,
                    colorUniformity,
                    greenShadeVariety,
                    greenVariation,
                    avgEdgeIntensity
                );

                resolve({
                    isPlant: isPlant.detected,
                    confidence: isPlant.confidence,
                    reason: isPlant.reason,
                    details: {
                        greenRatio: (greenRatio * 100).toFixed(1) + '%',
                        brownRatio: (brownRatio * 100).toFixed(1) + '%',
                        colorVariance: avgVariance.toFixed(2),
                        edgeRatio: (edgeRatio * 100).toFixed(2) + '%',
                        textureComplexity: textureComplexity.toFixed(2),
                        colorUniformity: colorUniformity.toFixed(1) + '%',
                        greenShades: greenShadeVariety,
                        imageSize: `${width}x${height}`
                    }
                });
            };

            img.onerror = () => {
                resolve({
                    isPlant: false,
                    confidence: 0,
                    reason: "Unable to process image. Please ensure it's a valid image file.",
                    details: null
                });
            };

            img.src = imageData;
        });
    },

    evaluatePlantLikelihood(greenRatio, brownRatio, colorVariance, width, height,
        edgeRatio, textureComplexity, colorUniformity,
        greenShadeVariety, greenVariation, avgEdgeIntensity) {
        // Advanced scoring system with strict criteria for plant detection
        let score = 0;
        let reasons = [];
        let warnings = [];

        // CRITICAL: Reject solid/uniform colors (not plants)
        if (colorUniformity > 85) {
            score -= 50;
            warnings.push("Image appears to be a solid/uniform color");
            reasons.push("Very uniform color detected - unlikely to be a plant");
        }

        // CRITICAL: Reject images with no edges (plants have structure)
        if (edgeRatio < 0.01) {
            score -= 40;
            warnings.push("No structural edges detected");
            reasons.push("Lacks structural elements typical of plants");
        }

        // CRITICAL: Reject images with low texture (plants have organic texture)
        if (textureComplexity < 5) {
            score -= 30;
            warnings.push("Very low texture complexity");
            reasons.push("Image lacks organic texture patterns");
        }

        // Green color presence - but must have variation
        if (greenRatio > 0.2) {
            if (greenShadeVariety >= 5) {
                score += 25;
                reasons.push(`Strong green presence with ${greenShadeVariety} different shades (indicates plant variety)`);
            } else if (greenShadeVariety >= 3) {
                score += 15;
                reasons.push(`Green colors detected with ${greenShadeVariety} shade variations`);
            } else {
                score += 5;
                warnings.push("Green detected but lacks shade variety");
                reasons.push("Green color present but may be uniform/solid");
            }
        } else if (greenRatio > 0.1) {
            if (greenShadeVariety >= 3) {
                score += 10;
                reasons.push("Moderate green with good shade variety");
            } else {
                score += 2;
                warnings.push("Limited green with little variation");
            }
        } else {
            warnings.push("Very little or no green color detected");
            reasons.push("Insufficient green color for plant identification");
        }

        // Green variation within green areas (plants have varied greens)
        if (greenVariation > 15) {
            score += 20;
            reasons.push("Good variation in green tones (typical of natural plant leaves)");
        } else if (greenVariation > 8) {
            score += 10;
            reasons.push("Moderate green variation detected");
        } else if (greenRatio > 0.1 && greenVariation < 5) {
            score -= 15;
            warnings.push("Green areas are too uniform");
            reasons.push("Green colors lack natural variation");
        }

        // Edge detection (plants have many edges from leaves, stems, veins)
        if (edgeRatio > 0.05 && avgEdgeIntensity > 40) {
            score += 25;
            reasons.push("Strong edge patterns detected (suggests leaf/stem structures)");
        } else if (edgeRatio > 0.02) {
            score += 10;
            reasons.push("Some structural edges detected");
        } else {
            warnings.push("Insufficient edge patterns for plant structures");
        }

        // Texture complexity (plants have organic, complex textures)
        if (textureComplexity > 20) {
            score += 20;
            reasons.push("High texture complexity (organic patterns detected)");
        } else if (textureComplexity > 10) {
            score += 10;
            reasons.push("Moderate texture complexity");
        } else if (textureComplexity < 5 && greenRatio > 0.1) {
            score -= 20;
            warnings.push("Texture too simple for a plant");
            reasons.push("Lacks organic texture patterns");
        }

        // Color variance (plants have varied colors)
        if (colorVariance > 40) {
            score += 15;
            reasons.push("High overall color variation");
        } else if (colorVariance > 25) {
            score += 8;
            reasons.push("Moderate color variation");
        } else if (colorVariance < 15 && greenRatio > 0.1) {
            score -= 15;
            warnings.push("Colors too uniform");
            reasons.push("Insufficient color variation for natural plant");
        }

        // Brown/soil presence (contextual indicator)
        if (brownRatio > 0.15 && greenRatio > 0.15) {
            score += 10;
            reasons.push("Soil/ground context detected with plant matter");
        } else if (brownRatio > 0.05 && greenRatio > 0.1) {
            score += 5;
            reasons.push("Some soil/ground elements detected");
        }

        // Image size validation
        const pixelCount = width * height;
        if (pixelCount < 10000) {
            score -= 15;
            warnings.push("Image resolution too low for accurate analysis");
        } else if (pixelCount > 100000) {
            score += 5;
            reasons.push("Good image resolution");
        }

        // FINAL VALIDATION: Must pass multiple criteria
        const hasGreen = greenRatio > 0.1;
        const hasEdges = edgeRatio > 0.01;
        const hasTexture = textureComplexity > 5;
        const hasVariation = colorUniformity < 85;
        const hasGreenVariety = greenShadeVariety >= 3;

        const criteriaMet = [hasGreen, hasEdges, hasTexture, hasVariation, hasGreenVariety].filter(Boolean).length;

        if (criteriaMet < 3) {
            score -= 30;
            warnings.push(`Only ${criteriaMet} out of 5 plant criteria met`);
        }

        // Determine result with much stricter threshold
        const confidence = Math.min(100, Math.max(0, score));
        const detected = confidence >= 50 && criteriaMet >= 3 && warnings.length < 3; // Much stricter threshold

        // Build detailed reason
        let reason;
        if (detected) {
            reason = `✅ Plant detected with ${confidence.toFixed(0)}% confidence.\n\n`;
            reason += `**Positive Indicators:**\n`;
            reasons.forEach(r => reason += `• ${r}\n`);
            if (warnings.length > 0) {
                reason += `\n**Notes:**\n`;
                warnings.forEach(w => reason += `• ${w}\n`);
            }
        } else {
            reason = `❌ Plant not detected (${confidence.toFixed(0)}% confidence).\n\n`;
            reason += `**Analysis Results:**\n`;
            reasons.forEach(r => reason += `• ${r}\n`);
            if (warnings.length > 0) {
                reason += `\n**Issues Found:**\n`;
                warnings.forEach(w => reason += `• ${w}\n`);
            }
            reason += `\n**Criteria Met:** ${criteriaMet}/5 required plant characteristics\n`;
            reason += `This image likely contains:\n`;
            if (colorUniformity > 85) {
                reason += `• A solid color or pattern (not a plant)\n`;
            } else if (edgeRatio < 0.01) {
                reason += `• A uniform image without plant structures\n`;
            } else if (greenShadeVariety < 3 && greenRatio > 0.1) {
                reason += `• A green image but not an actual plant\n`;
            } else {
                reason += `• Something other than a plant, or the plant is not clearly visible\n`;
            }
        }

        return { detected, confidence, reason, reasons, warnings, criteriaMet };
    },

    analyzeImage(imageData) {
        // Enhanced image analysis with actual disease detection
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
                const width = canvas.width;
                const height = canvas.height;

                // Analysis metrics
                let totalPixels = 0;
                let greenPixels = 0;
                let brownPixels = 0;
                let yellowPixels = 0;
                let blackPixels = 0;
                let whitePixels = 0;

                // Sample every 4th pixel for performance
                const sampleRate = 4;

                for (let y = 0; y < height; y += sampleRate) {
                    for (let x = 0; x < width; x += sampleRate) {
                        const idx = (y * width + x) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];

                        totalPixels++;

                        // Detect green (healthy leaf color)
                        const isGreen = g > r + 15 && g > b + 15 && g > 50 && g < 200;
                        if (isGreen) greenPixels++;

                        // Detect brown spots (fungal/bacterial infection)
                        const isBrown = r > 80 && r < 180 && g > 50 && g < 140 && b < 100 && Math.abs(r - g) < 60;
                        if (isBrown) brownPixels++;

                        // Detect yellow (chlorosis, nutrient deficiency)
                        const isYellow = r > 150 && g > 150 && b < 120 && Math.abs(r - g) < 40;
                        if (isYellow) yellowPixels++;

                        // Detect black/dark spots (severe disease)
                        const isBlack = r < 80 && g < 80 && b < 80;
                        if (isBlack) blackPixels++;

                        // Detect white/pale areas (powdery mildew, bleaching)
                        const isWhite = r > 200 && g > 200 && b > 200;
                        if (isWhite) whitePixels++;
                    }
                }

                // Calculate percentages
                const greenRatio = greenPixels / totalPixels;
                const brownRatio = brownPixels / totalPixels;
                const yellowRatio = yellowPixels / totalPixels;
                const blackRatio = blackPixels / totalPixels;
                const whiteRatio = whitePixels / totalPixels;

                // Disease detection logic
                let condition = "";
                let details = "";
                let confidence = "moderate";
                let recommendations = "";
                let followUp = "";
                let severity = "mild";

                // Calculate disease score
                const diseaseScore = (brownRatio * 100) + (yellowRatio * 80) + (blackRatio * 120) + (whiteRatio * 60);

                // Determine condition based on analysis
                if (brownRatio > 0.08 || blackRatio > 0.05) {
                    // Significant brown or black spots detected
                    condition = "Fungal or Bacterial Leaf Spot Disease";
                    severity = brownRatio > 0.15 || blackRatio > 0.08 ? "high" : "moderate";
                    details = `I've detected significant brown and dark spots covering approximately ${((brownRatio + blackRatio) * 100).toFixed(1)}% of the leaf area. This pattern is consistent with fungal leaf spot disease (such as Cercospora, Septoria, or Anthracnose) or bacterial leaf spot. The spots appear as irregular lesions which can spread rapidly in humid conditions.`;
                    recommendations = "Remove and destroy affected leaves immediately to prevent spread. Apply copper-based fungicide or neem oil every 7-10 days. Improve air circulation around plants. Avoid overhead watering - water at the base only. Isolate infected plants if possible.";
                    followUp = "Are the spots spreading to other leaves? Do they have yellow halos around them?";
                    confidence = "high";
                } else if (yellowRatio > 0.12) {
                    // Significant yellowing detected
                    condition = "Chlorosis / Nutrient Deficiency";
                    severity = "moderate";
                    details = `I've identified significant yellowing affecting approximately ${(yellowRatio * 100).toFixed(1)}% of the leaf. This chlorosis pattern suggests nutrient deficiency (likely nitrogen, iron, or magnesium) or possible overwatering leading to poor nutrient uptake.`;
                    recommendations = "Check soil pH and nutrient levels. Apply balanced fertilizer (NPK 10-10-10) or iron chelate if iron deficiency is suspected. Ensure proper drainage to prevent waterlogging. Test soil moisture before watering.";
                    followUp = "Is the yellowing on older leaves (bottom) or new growth (top)? How often are you watering?";
                    confidence = "moderate";
                } else if (whiteRatio > 0.10) {
                    // White/pale areas detected
                    condition = "Powdery Mildew or Sun Scorch";
                    severity = "moderate";
                    details = `I've detected white or pale areas covering approximately ${(whiteRatio * 100).toFixed(1)}% of the leaf surface. This could indicate powdery mildew (fungal infection) or sun scorch from excessive direct sunlight.`;
                    recommendations = "If powdery: Apply sulfur-based fungicide or baking soda solution (1 tsp per quart water). Improve air circulation. If sun scorch: Move plant to location with filtered light or morning sun only.";
                    followUp = "Is the white area powdery/fuzzy, or is it dry and crispy?";
                    confidence = "moderate";
                } else if (brownRatio > 0.03 && yellowRatio > 0.05) {
                    // Moderate disease indicators
                    condition = "Early Stage Leaf Disease";
                    severity = "mild";
                    details = `I've detected early signs of leaf damage with small brown spots and some yellowing. This appears to be an early-stage infection that can be managed with prompt treatment.`;
                    recommendations = "Monitor closely for spread. Remove any severely affected leaves. Apply preventive fungicide treatment. Ensure good cultural practices (proper watering, air circulation, sunlight).";
                    followUp = "When did you first notice these symptoms? Have they been spreading?";
                    confidence = "moderate";
                } else if (greenRatio > 0.60 && diseaseScore < 5) {
                    // Mostly healthy
                    condition = "Healthy Leaf with Minor Variations";
                    severity = "none";
                    details = `The leaf appears to be in good overall condition with ${(greenRatio * 100).toFixed(1)}% healthy green coloration. Any minor variations detected are within normal range for natural leaf aging or environmental adaptation.`;
                    recommendations = "Continue current care routine. Monitor for any changes. Ensure consistent watering schedule and adequate light exposure. Regular inspection helps catch issues early.";
                    followUp = "Is there a specific concern you have about this plant?";
                    confidence = "high";
                } else {
                    // Mixed or unclear symptoms
                    condition = "Mixed Symptoms Detected";
                    severity = "moderate";
                    details = `I've detected a combination of symptoms including some discoloration and spotting. This could indicate multiple stress factors or early disease development.`;
                    recommendations = "Inspect the plant thoroughly for pests, check soil moisture and drainage, ensure adequate light and air circulation. Consider applying broad-spectrum organic fungicide as a preventive measure.";
                    followUp = "Can you describe the growing conditions? (Light, water frequency, location)";
                    confidence = "moderate";
                }

                // Build response
                const severityEmoji = {
                    "high": "🔴",
                    "moderate": "🟡",
                    "mild": "🟢",
                    "none": "✅"
                };

                let response = `🔍 **Image Analysis Complete**\n\n`;
                response += `${severityEmoji[severity]} **Condition Detected:** ${condition}\n\n`;
                response += `**Confidence Level:** ${confidence}\n\n`;
                response += `**Analysis Details:** ${details}\n\n`;
                response += `**Recommendations:** ${recommendations}\n\n`;
                response += `**Technical Data:**\n`;
                response += `• Healthy green: ${(greenRatio * 100).toFixed(1)}%\n`;
                response += `• Brown spots: ${(brownRatio * 100).toFixed(1)}%\n`;
                response += `• Yellow areas: ${(yellowRatio * 100).toFixed(1)}%\n`;
                response += `• Dark spots: ${(blackRatio * 100).toFixed(1)}%\n\n`;
                response += followUp;

                resolve(response);
            };

            img.onerror = () => {
                resolve(`❌ **Error analyzing image**\n\nUnable to process the image. Please ensure it's a valid image file and try again.`);
            };

            img.src = imageData;
        });
    }
};

async function loadDoctor() {
    const logList = document.getElementById("issueLogList");
    if (!logList) return;

    const email = localStorage.getItem("pm_user_email");
    if (!email) {
        logList.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">Please log in to see diagnoses.</div>';
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/api/diagnoses?email=${encodeURIComponent(email)}`);
        if (!resp.ok) throw new Error('Failed to fetch');
        const diagnoses = await resp.json();

        if (diagnoses.length === 0) {
            logList.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 14px;">No diagnoses yet.</div>';
            return;
        }

        logList.innerHTML = diagnoses.map(i => {
            const displayTitle = cleanDiagnosisTitle(i.title);
            // Default to 'Condition' if first word is empty or too short
            let category = displayTitle.split(' ')[0];
            if (!category || category.length < 3) category = "Health";

            return `
                <div class="issue-item ${i.status || 'open'}">
                    <div class="issue-severity">
                      <span>${category}</span>
                      <span class="severity-badge severity-${i.severity || 'high'}">${(i.status || 'Urgent').toUpperCase()}</span>
                    </div>
                    <div class="issue-title">${displayTitle}</div>
                    <div class="issue-date">${i.date || 'Just now'}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error loading diagnoses:", err);
        logList.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">Unable to load diagnosis history.</div>';
    }
}

function sendDoctorMessage() {
    const input = document.getElementById("doctorInput");
    const display = document.getElementById("doctorChatDisplay");

    const text = input.value.trim();
    if (!text) return;

    // User msg
    const userDiv = document.createElement('div');
    userDiv.className = 'user-msg';
    userDiv.textContent = text;
    display.appendChild(userDiv);

    input.value = "";
    display.scrollTop = display.scrollHeight;

    // Enhanced Thinking State with multiple stages
    const thinkingMessages = [
        "Analyzing symptoms...",
        "Cross-referencing knowledge base...",
        "Checking plant context...",
        "Generating diagnosis..."
    ];

    let thinkingIndex = 0;
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'bot-msg thinking';
    thinkingDiv.textContent = thinkingMessages[0];
    display.appendChild(thinkingDiv);

    // Smooth scroll
    display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });

    // Animate thinking messages
    const thinkingInterval = setInterval(() => {
        thinkingIndex++;
        if (thinkingIndex < thinkingMessages.length) {
            thinkingDiv.textContent = thinkingMessages[thinkingIndex];
            display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });
        } else {
            clearInterval(thinkingInterval);
        }
    }, 500);

    // Bot Response with advanced AI
    setTimeout(async () => {
        clearInterval(thinkingInterval);
        if (display.contains(thinkingDiv)) display.removeChild(thinkingDiv);

        const botDiv = document.createElement('div');
        botDiv.className = 'bot-msg';

        // Use the Advanced Brain!
        const response = PlantDoctorBrain.analyze(text);

        // Format response with proper line breaks and markdown-style formatting
        botDiv.innerHTML = response
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/•/g, '•');

        display.appendChild(botDiv);
        display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });

        // Save to database if it's a diagnosis
        if (response.includes("severity issue")) {
            const cleanTitle = (text.length > 40 ? text.substring(0, 37) + "..." : text);
            const severity = response.includes("**high**") ? "high" : (response.includes("**mild**") ? "low" : "medium");
            const status = response.includes("**high**") ? "Urgent" : (response.includes("**mild**") ? "Monitoring" : "Attention");
            await saveDiagnosis(cleanTitle, severity, status);
        }
    }, 2500);
}

function cleanDiagnosisTitle(text) {
    if (!text) return "";
    return text
        .replace(/^[*\s]+|[*\s]+$/g, '') // Remove leading/trailing asterisks and spaces
        .replace(/\*\*/g, '')           // Remove bold markdown
        .replace(/\*/g, '')            // Remove italic markdown
        .replace(/#/g, '')             // Remove headers
        .replace(/[📋🔍✅❌🔴🟢]/g, '')    // Remove common emojis
        .replace(/\s{2,}/g, ' ')       // Compact multiple spaces
        .trim();
}

async function saveDiagnosis(title, severity, status) {
    const email = localStorage.getItem("pm_user_email");
    if (!email) return;

    try {
        const resp = await fetch(API_BASE_URL + '/api/diagnoses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: email,
                title: title,
                severity: severity,
                status: status,
                date: 'Just now'
            })
        });
        if (resp.ok) {
            loadDoctor(); // Refresh the list
        }
    } catch (err) {
        console.error("Failed to save diagnosis:", err);
    }
}

function handleDoctorImageUpload(file) {
    const display = document.getElementById("doctorChatDisplay");
    if (!display) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;

        // 1. Show user message with image
        const userDiv = document.createElement('div');
        userDiv.className = 'user-msg';
        userDiv.innerHTML = `
      <p>I've uploaded a photo of my plant:</p>
      <img src="${imageData}" style="max-width: 100%; border-radius: 12px; margin-top: 8px; cursor: pointer;" onclick="openImageModalDirect('${imageData}')">
    `;
        display.appendChild(userDiv);
        display.scrollTop = display.scrollHeight;

        // 2. Plant Detection Phase
        const detectionMessages = [
            "Loading image...",
            "Analyzing image structure...",
            "Detecting plant characteristics...",
            "Evaluating color patterns...",
            "Verifying plant presence..."
        ];

        let detectionIndex = 0;
        const detectionDiv = document.createElement('div');
        detectionDiv.className = 'bot-msg thinking';
        detectionDiv.textContent = detectionMessages[0];
        display.appendChild(detectionDiv);
        display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });

        const detectionInterval = setInterval(() => {
            detectionIndex++;
            if (detectionIndex < detectionMessages.length) {
                detectionDiv.textContent = detectionMessages[detectionIndex];
                display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });
            } else {
                clearInterval(detectionInterval);
            }
        }, 500);

        // Perform plant detection
        PlantDoctorBrain.detectPlant(imageData).then((detectionResult) => {
            clearInterval(detectionInterval);
            if (display.contains(detectionDiv)) display.removeChild(detectionDiv);

            // 3. Handle detection result
            if (!detectionResult.isPlant) {
                // Not a plant - show detailed warning with analysis
                const warningDiv = document.createElement('div');
                warningDiv.className = 'bot-msg';
                warningDiv.style.borderLeft = '4px solid #e74c3c';
                warningDiv.style.background = '#fff5f5';

                let warningResponse = detectionResult.reason; // Already contains detailed analysis

                // Add technical details if available
                if (detectionResult.details) {
                    warningResponse += `\n\n**Technical Analysis:**\n`;
                    warningResponse += `• Green coverage: ${detectionResult.details.greenRatio}\n`;
                    warningResponse += `• Edge patterns: ${detectionResult.details.edgeRatio}\n`;
                    warningResponse += `• Texture complexity: ${detectionResult.details.textureComplexity}\n`;
                    warningResponse += `• Color uniformity: ${detectionResult.details.colorUniformity}\n`;
                    warningResponse += `• Green shade variety: ${detectionResult.details.greenShades} different shades\n`;
                }

                warningResponse += `\n\n**What this means:**\n`;
                if (detectionResult.details && parseFloat(detectionResult.details.colorUniformity) > 85) {
                    warningResponse += `This image appears to be a solid color or very uniform pattern, not an actual plant. Plants have varied colors, textures, and structural elements.\n\n`;
                } else if (detectionResult.details && parseFloat(detectionResult.details.edgeRatio) < 0.01) {
                    warningResponse += `No structural elements (like leaves, stems, or edges) were detected. Real plants have visible structures.\n\n`;
                } else if (detectionResult.details && detectionResult.details.greenShades < 3) {
                    warningResponse += `While green colors are present, they lack the natural variety found in real plants. Actual plants have multiple shades of green.\n\n`;
                } else {
                    warningResponse += `The image doesn't meet the criteria for plant detection. It may be a pattern, solid color, or the plant may not be clearly visible.\n\n`;
                }

                warningResponse += `**To get accurate diagnosis:**\n`;
                warningResponse += `• Upload a clear photo of an actual plant\n`;
                warningResponse += `• Ensure the plant fills most of the frame\n`;
                warningResponse += `• Use good lighting to show plant details\n`;
                warningResponse += `• Focus on leaves, stems, or affected areas\n\n`;
                warningResponse += `💡 **Alternative:** Describe the symptoms in text, and I'll help diagnose the issue!`;

                warningDiv.innerHTML = warningResponse
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/•/g, '•')
                    .replace(/✅/g, '✅')
                    .replace(/❌/g, '❌');

                display.appendChild(warningDiv);
                display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });

                // Store in conversation history
                PlantDoctorBrain.conversationHistory.push({ role: 'user', text: '[Image uploaded - plant not detected]' });
                PlantDoctorBrain.conversationHistory.push({ role: 'assistant', text: warningResponse });

                return;
            }

            // Plant detected - proceed with analysis
            const analysisMessages = [
                "Plant confirmed! Analyzing health...",
                "Detecting leaf patterns...",
                "Identifying color anomalies...",
                "Cross-referencing symptoms database...",
                "Generating diagnosis..."
            ];

            let analysisIndex = 0;
            const analysisDiv = document.createElement('div');
            analysisDiv.className = 'bot-msg thinking';
            analysisDiv.textContent = analysisMessages[0];
            display.appendChild(analysisDiv);
            display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });

            const analysisInterval = setInterval(() => {
                analysisIndex++;
                if (analysisIndex < analysisMessages.length) {
                    analysisDiv.textContent = analysisMessages[analysisIndex];
                    display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });
                } else {
                    clearInterval(analysisInterval);
                }
            }, 600);

            // 4. Advanced Bot Response with plant analysis
            setTimeout(() => {
                clearInterval(analysisInterval);
                if (display.contains(analysisDiv)) display.removeChild(analysisDiv);

                const botDiv = document.createElement('div');
                botDiv.className = 'bot-msg';

                // Build response with detection info and analysis
                let response = `✅ **Plant Detected** (${detectionResult.confidence}% confidence)\n\n`;
                response += `**Detection Details:** ${detectionResult.reason}\n\n`;
                response += `---\n\n`;

                // Use advanced image analysis (now returns a Promise)
                PlantDoctorBrain.analyzeImage(imageData).then(async (analysisResponse) => {
                    response += analysisResponse;

                    botDiv.innerHTML = response
                        .replace(/\n\n/g, '<br><br>')
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/---/g, '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 12px 0;">');

                    display.appendChild(botDiv);
                    display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });

                    // Store in conversation history
                    PlantDoctorBrain.conversationHistory.push({ role: 'user', text: '[Image uploaded - plant detected]' });
                    PlantDoctorBrain.conversationHistory.push({ role: 'assistant', text: response });

                    // Save diagnosis to DB
                    let rawTitle = (analysisResponse.includes("Condition Detected:") ?
                        analysisResponse.split("Condition Detected:")[1].split("\n")[0] :
                        "Image Diagnosis");

                    const title = cleanDiagnosisTitle(rawTitle).substring(0, 45);
                    const severity = analysisResponse.includes("🔴") ? "high" : (analysisResponse.includes("🟢") ? "low" : "medium");
                    const status = analysisResponse.includes("🔴") ? "Urgent" : (analysisResponse.includes("🟢") ? "Stable" : "Concern");
                    await saveDiagnosis(title, severity, status);
                });
            }, 3500);
        }).catch((error) => {
            clearInterval(detectionInterval);
            if (display.contains(detectionDiv)) display.removeChild(detectionDiv);

            // Error handling
            const errorDiv = document.createElement('div');
            errorDiv.className = 'bot-msg';
            errorDiv.style.borderLeft = '4px solid #e74c3c';
            errorDiv.innerHTML = `❌ **Error processing image**<br><br>Unable to analyze the image. Please try uploading again or describe the symptoms in text.`;
            display.appendChild(errorDiv);
            display.scrollTo({ top: display.scrollHeight, behavior: 'smooth' });
        });
    };
    reader.readAsDataURL(file);
}

// Helper for modal without canvas
function openImageModalDirect(src) {
    const modal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");
    if (modal && modalImage) {
        modalImage.src = src;
        modal.classList.add("active");
    }
}
