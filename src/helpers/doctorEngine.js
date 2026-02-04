/**
 * DOCTOR AI BRAIN - BACKEND ENGINE (Node.js Port)
 * Faithfully ported from plantdoctor.js to ensure consistent, advanced AI behavior.
 */

const knowledgeBase = {
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
    ]
};

function generateDiagnosis(query, imageUrl = null) {
    const input = (query || "").toLowerCase();

    // Text matching logic from PlantDoctorBrain.analyze
    let matches = [];
    knowledgeBase.symptoms.forEach(s => {
        const matchCount = s.keywords.filter(k => input.includes(k)).length;
        if (matchCount > 0) {
            matches.push({ ...s, matchScore: matchCount });
        }
    });

    // Sort matches by relevance
    matches.sort((a, b) => b.matchScore - a.matchScore);

    if (matches.length > 0) {
        const primaryMatch = matches[0];
        const secondaryMatches = matches.slice(1, 3);
        const severityEmoji = { "high": "🔴", "moderate": "🟡", "mild": "🟢" };

        let response = `${severityEmoji[primaryMatch.severity] || "🟡"} Based on your description, I've identified a **${primaryMatch.severity}** severity issue.\n\n`;
        response += `**Primary Concern:** ${primaryMatch.causes.slice(0, 2).join(" or ")}\n\n`;

        if (secondaryMatches.length > 0) {
            response += `I also notice signs of: ${secondaryMatches.map(m => m.keywords[0]).join(", ")}. This suggests a compound issue.\n\n`;
        }

        response += `**Immediate Action:** ${primaryMatch.advice}\n\n`;
        response += `**Treatment Plan:** ${primaryMatch.treatment}\n\n`;
        response += primaryMatch.followUp;
        return response;
    }

    // Default responses
    if (/^(hello|hi|hey|greetings)/i.test(input)) {
        return "Hello! I'm your advanced AI Plant Doctor. I can help diagnose plant issues, provide treatment plans, and answer care questions. Describe any symptoms you're seeing, or ask about specific plants.";
    }

    return "I want to help you accurately! Could you provide more details?\n\n**Please describe:**\n• What symptoms are you seeing? (color changes, spots, wilting, etc.)\n• Which part of the plant? (leaves, stems, roots, flowers)\n• When did you first notice this?\n• Any recent changes in care or environment?";
}

module.exports = {
    generateDiagnosis
};
