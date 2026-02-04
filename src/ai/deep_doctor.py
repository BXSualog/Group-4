"""
PLANT DOCTOR - DEEP ANALYSIS ENGINE (Python)
Advanced pixel-level analysis using comprehensive symptom detection.
Uses Pillow for image processing and NumPy for matrix analysis.
"""

import sys
import json
import os
import math

# Try to import required libraries
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# ═══════════════════════════════════════════════════════════════════════════
# SYMPTOM DATABASE WITH AI CLUES
# ═══════════════════════════════════════════════════════════════════════════

SYMPTOM_DB = {
    "chlorosis": {
        "name": "Yellowing / Chlorosis",
        "emoji": "🟡",
        "severity": "moderate",
        "clues": [
            "Leaf color shifts from green → yellow",
            "Uniform yellowing or pale veins",
            "Reduced green-channel intensity",
            "No visible spots or holes"
        ],
        "advice": "Check soil moisture and nutrient levels. Apply nitrogen-rich or iron-chelate fertilizer based on which leaves are affected.",
        "treatment": "For older leaf yellowing: Apply nitrogen fertilizer. For new leaf yellowing: Apply iron chelate. Adjust watering schedule."
    },
    "spots": {
        "name": "Leaf Spots / Lesions",
        "emoji": "🟤",
        "severity": "moderate",
        "clues": [
            "Circular or irregular dark spots",
            "Brown, black, or rust-colored areas",
            "Spots may have yellow halos",
            "Localized damage (not whole leaf)"
        ],
        "advice": "Remove affected leaves immediately to prevent spread. Avoid overhead watering.",
        "treatment": "Prune infected leaves. Apply copper-based fungicide or neem oil every 7-10 days."
    },
    "wilting": {
        "name": "Wilting / Drooping",
        "emoji": "🥀",
        "severity": "high",
        "clues": [
            "Leaves hang downward",
            "Loss of leaf firmness (turgor)",
            "Stem bending or leaning",
            "Reduced leaf surface area facing upward"
        ],
        "advice": "Check soil moisture immediately. If dry, water deeply. If wet, check for root rot.",
        "treatment": "For underwatering: Deep water and mist leaves. For overwatering: Stop watering, check roots, repot if needed."
    },
    "pests": {
        "name": "Pest Presence",
        "emoji": "🐛",
        "severity": "moderate",
        "clues": [
            "Small moving objects on leaves/stems",
            "Clusters near leaf veins or undersides",
            "Sticky residue (honeydew)",
            "Leaf distortion without discoloration"
        ],
        "advice": "Isolate the plant. Spray with neem oil solution or insecticidal soap.",
        "treatment": "Apply neem oil spray every 3-5 days for 2 weeks. Remove heavily infested leaves."
    },
    "dry": {
        "name": "Dry / Brittle / Crispy Leaves",
        "emoji": "🍂",
        "severity": "mild",
        "clues": [
            "Brown, dry leaf edges",
            "Cracking or splitting",
            "Leaves appear thinner and curled",
            "No softness or flexibility"
        ],
        "advice": "Increase watering frequency. Check if root-bound. Increase humidity.",
        "treatment": "Water deeply when top 2 inches are dry. Mist leaves daily. Move to less windy location."
    },
    "mold": {
        "name": "Mold / Powdery Mildew",
        "emoji": "🌫️",
        "severity": "moderate",
        "clues": [
            "White powdery coating on leaves",
            "Fuzzy or dusty surface texture",
            "Surface-level growth (even micro-patches)",
            "Often starts in shaded areas"
        ],
        "advice": "Improve air circulation. Remove affected leaves. Reduce humidity around the plant.",
        "treatment": "Apply baking soda solution (1 tsp per quart water) or sulfur-based fungicide weekly."
    },
    "holes": {
        "name": "Chewed / Holed Leaves",
        "emoji": "🕳️",
        "severity": "mild",
        "clues": [
            "Missing leaf tissue (includes micro-punctures)",
            "Round or irregular holes",
            "Edges appear torn or jagged",
            "Damage pattern inconsistent with disease"
        ],
        "advice": "Inspect plant at night when pests are active. Hand-pick visible pests.",
        "treatment": "Apply diatomaceous earth around base. Use Bt (Bacillus thuringiensis) for caterpillars."
    },
    "frail": {
        "name": "Weakened / Frail Leaves",
        "emoji": "🌱",
        "severity": "moderate",
        "clues": [
            "Leaves appear thin or translucent",
            "Pale color with low saturation",
            "Lack of structural rigidity",
            "General appearance of being 'frail'"
        ],
        "advice": "Provide more stable environment and balanced nutrients. Avoid sudden temperature changes.",
        "treatment": "Use a diluted liquid seaweed fertilizer. Ensure consistent hydration without overwatering."
    },
    "damaged": {
        "name": "General Physical Damage",
        "emoji": "🩹",
        "severity": "mild",
        "clues": [
            "Physical tears or jagged edges",
            "Bruising or crushed tissue",
            "Broken stems or leaf tips",
            "Localized mechanical stress"
        ],
        "advice": "Prune away heavily damaged parts to save energy for new growth.",
        "treatment": "Seal large stem wounds with pruning sealer if necessary. Support weakened branches with stakes."
    },
    "stunted": {
        "name": "Stunted / Slow Growth",
        "emoji": "📉",
        "severity": "mild",
        "clues": [
            "Smaller-than-normal leaves",
            "No new growth over time",
            "Short internode spacing",
            "Overall compact appearance"
        ],
        "advice": "Check if plant needs repotting. Ensure adequate light. Fertilize with balanced fertilizer.",
        "treatment": "Repot if root-bound. Apply slow-release fertilizer. Increase light exposure."
    },
    "leaf_drop": {
        "name": "Leaf Drop / Shedding",
        "emoji": "🍃",
        "severity": "moderate",
        "clues": [
            "Reduced leaf count",
            "Bare stems",
            "Fallen leaves near base",
            "Leaves may drop green or yellow"
        ],
        "advice": "Determine if natural (seasonal) or stress-related. Check soil moisture.",
        "treatment": "Maintain consistent watering. Avoid temperature extremes. Reduce stress factors."
    },
    "curling": {
        "name": "Leaf Curling / Distortion",
        "emoji": "🌀",
        "severity": "moderate",
        "clues": [
            "Leaves curl upward or downward",
            "Twisted or uneven shape",
            "Thickened or puckered tissue",
            "Often paired with pest signs"
        ],
        "advice": "Check for pests on leaf undersides. If no pests, may be viral - isolate plant.",
        "treatment": "Treat for pests with neem oil. Apply balanced fertilizer. Remove severely affected leaves."
    },
    "root_rot": {
        "name": "Root Rot / Soggy Soil",
        "emoji": "💧",
        "severity": "high",
        "clues": [
            "Soil appears dark and wet",
            "Leaves wilt despite moist soil",
            "Stem base darkened",
            "Roots (if visible) brown/black"
        ],
        "advice": "Stop watering immediately. Remove plant from pot. Trim all brown/mushy roots.",
        "treatment": "Repot with fresh, well-draining soil. Water sparingly until recovery. Apply root stimulator."
    },
    "sunburn": {
        "name": "Sunburn / Scorching",
        "emoji": "☀️",
        "severity": "mild",
        "clues": [
            "Bleached or white patches",
            "Brown crispy areas exposed to sun",
            "Damage localized to sun-facing leaves",
            "Sudden onset after relocation"
        ],
        "advice": "Move plant to location with filtered light or morning sun only.",
        "treatment": "Relocate to shadier spot. Mist leaves to cool. Prune severely damaged leaves."
    },
    "healthy": {
        "name": "Healthy Plant",
        "emoji": "✅",
        "severity": "none",
        "clues": [
            "Leaf color is uniform and vibrant green",
            "No discoloration, spots, or lesions",
            "Leaves are firm, full, and smooth",
            "Leaf edges are intact (no holes or tears)",
            "Leaves face upward or outward (good turgor)"
        ],
        "advice": "Your plant is thriving! Continue your current care routine.",
        "treatment": "Maintain consistent watering, light, and feeding schedule."
    }
}


def rgb_to_hsl(r, g, b):
    """Convert RGB to HSL color space."""
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    l = (max_c + min_c) / 2.0

    if max_c == min_c:
        h = s = 0.0
    else:
        d = max_c - min_c
        s = d / (2.0 - max_c - min_c) if l > 0.5 else d / (max_c + min_c)
        if max_c == r:
            h = (g - b) / d + (6.0 if g < b else 0.0)
        elif max_c == g:
            h = (b - r) / d + 2.0
        else:
            h = (r - g) / d + 4.0
        h *= 60.0

    return h, s, l


def analyze_image(image_path):
    """Perform deep analysis on the plant image."""
    
    if not os.path.exists(image_path):
        return {"error": "Image file not found", "path": image_path}

    if not HAS_PIL:
        return {
            "status": "warning",
            "message": "Python Deep Scan requires 'Pillow' library. Run: pip install Pillow",
            "fallback": True
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # ANALYSIS SEGMENT FUNCTION
    # ═══════════════════════════════════════════════════════════════════════════
    def analyze_segment(segment_pixels, is_center=False):
        """Analyzes a list of RGB pixels and returns metrics & scores."""
        
        count = len(segment_pixels)
        if count == 0: return None

        seg_stats = {
            "green": 0, "yellow": 0, "brown": 0, "black": 0, "white": 0,
            "bleached": 0, "crispy": 0, "brightness": 0, "saturation": 0,
            "low_sat": 0, "high_bright": 0, "texture_breaks": 0,
            "green_intensities": []
        }

        prev_hue = None
        # Adaptive sampling: Analyze more pixels for center segment (zoom focus)
        # Sample rate: Analyze ~2500 pixels per segment
        step = max(1, count // (3500 if is_center else 1500))
        
        sampled = 0
        for i in range(0, count, step):
            r, g, b = segment_pixels[i]
            h, s, l = rgb_to_hsl(r, g, b)
            
            # Skip background
            if l > 0.92 or (s < 0.08 and l > 0.6): continue
            
            sampled += 1
            seg_stats["brightness"] += l
            seg_stats["saturation"] += s
            
            if s < 0.25: seg_stats["low_sat"] += 1
            if l > 0.65: seg_stats["high_bright"] += 1
            
            if prev_hue is not None and abs(h - prev_hue) > 30:
                seg_stats["texture_breaks"] += 1
            prev_hue = h
            
            # Color Buckets
            if 0 <= h <= 40 and s > 0.15 and 0.15 < l < 0.55:
                seg_stats["brown"] += 1
                if l > 0.40: seg_stats["crispy"] += 1
            elif 40 < h <= 70 and s > 0.20:
                seg_stats["yellow"] += 1
            elif 70 < h <= 165 and s > 0.15:
                seg_stats["green"] += 1
                seg_stats["green_intensities"].append(g)
            elif l < 0.12:
                seg_stats["black"] += 1
            elif l > 0.75 and s < 0.20:
                seg_stats["white"] += 1
            elif l > 0.68 and s < 0.30:
                seg_stats["bleached"] += 1

        if sampled == 0: return None
        
        # Calculate Ratios
        ratios = {k: v / sampled for k, v in seg_stats.items() if k in ["green", "yellow", "brown", "black", "white", "bleached", "crispy", "low_sat", "high_bright", "texture_breaks"]}
        ratios["avg_brightness"] = seg_stats["brightness"] / sampled
        ratios["avg_saturation"] = seg_stats["saturation"] / sampled
        
        # Variance
        ratios["green_variance"] = 0
        if seg_stats["green_intensities"]:
            mean_g = sum(seg_stats["green_intensities"]) / len(seg_stats["green_intensities"])
            ratios["green_variance"] = sum((x - mean_g) ** 2 for x in seg_stats["green_intensities"]) / len(seg_stats["green_intensities"])

        return ratios

    # ═══════════════════════════════════════════════════════════════════════════
    # MAIN EXECUTION
    # ═══════════════════════════════════════════════════════════════════════════

    try:
        img = Image.open(image_path).convert('RGB')
        
        # High Quality Zoom Resize (1200px)
        width, height = img.size
        target_size = 1200
        if width > target_size or height > target_size:
            img.thumbnail((target_size, target_size))
            width, height = img.size

        # 1. Full Image Scan
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            full_pixels = list(img.getdata())
        
        full_analysis = analyze_segment(full_pixels, is_center=True)
        if not full_analysis:
             return {"error": "No plant tissue detected in image"}

        # 2. Zone Analysis (Zoom in on defects)
        # We process the center crop specifically as it usually holds the subject
        center_crop = img.crop((width*0.25, height*0.25, width*0.75, height*0.75))
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            center_pixels = list(center_crop.getdata())
        
        center_analysis = analyze_segment(center_pixels, is_center=True)
        
        # Use center analysis if it detects deeper issues, otherwise use full
        # This prioritizes the subject over the background
        final_metrics = full_analysis
        
        # Heuristic: If center is significantly more diseased, use center
        if center_analysis:
            center_disease_score = center_analysis["yellow"] + center_analysis["brown"] + center_analysis["white"]
            full_disease_score = full_analysis["yellow"] + full_analysis["brown"] + full_analysis["white"]
            
            if center_disease_score > full_disease_score * 1.2:
                final_metrics = center_analysis
                # Boost confidence for "Zoom" finding
        
        # Unpack metrics for scoring
        green_ratio = final_metrics["green"]
        yellow_ratio = final_metrics["yellow"]
        brown_ratio = final_metrics["brown"]
        black_ratio = final_metrics["black"]
        white_ratio = final_metrics["white"]
        bleached_ratio = final_metrics["bleached"]
        crispy_ratio = final_metrics["crispy"]
        avg_brightness = final_metrics["avg_brightness"]
        avg_saturation = final_metrics["avg_saturation"]
        low_sat_ratio = final_metrics["low_sat"]
        high_bright_ratio = final_metrics["high_bright"]
        texture_score = final_metrics["texture_breaks"]
        green_variance = final_metrics["green_variance"]

        # ═══════════════════════════════════════════════════════════════
        # MULTI-SIGNAL SCORING SYSTEM (Existing Logic)
        # ═══════════════════════════════════════════════════════════════
        
        scores = {}
        detected_signals = []
        
        # 1. SUNBURN
        if bleached_ratio > 0.05 and avg_brightness > 0.55:
            scores["sunburn"] = 40 + (bleached_ratio * 200) + (high_bright_ratio * 50)
            detected_signals.append(f"Bleached patches: {bleached_ratio*100:.1f}%")
            detected_signals.append(f"High brightness areas detected")
        
        # 2. MOLD/MILDEW (Ultra-Sensitve)
        if white_ratio > 0.015 and low_sat_ratio > 0.10:
            scores["mold"] = 45 + (white_ratio * 300) + (low_sat_ratio * 40)
            detected_signals.append(f"Trace white powdery coverage detected: {white_ratio*100:.2f}%")
            detected_signals.append(f"Subtle low-saturation surface areas")
        
        # 3. LEAF SPOTS (Ultra-Sensitive)
        if brown_ratio > 0.005 and texture_score > 0.01:
            scores["spots"] = 45 + (brown_ratio * 600) + (texture_score * 80)
            detected_signals.append(f"Minor spot coverage detected: {brown_ratio*100:.2f}%")
            detected_signals.append(f"Early texture breaks (micro-lesions)")
        
        # 4. DRY/CRISPY
        if crispy_ratio > 0.03 or (brown_ratio > 0.01 and avg_brightness > 0.50):
            scores["dry"] = 35 + (crispy_ratio * 250)
            detected_signals.append(f"Crispy edges: {crispy_ratio*100:.1f}%")
        
        # 5. CHLOROSIS
        if yellow_ratio > 0.06:
            vein_contrast = green_variance > 450
            scores["chlorosis"] = 40 + (yellow_ratio * 250)
            if vein_contrast:
                scores["chlorosis"] += 15
                detected_signals.append("Subtle vein contrast pattern")
            detected_signals.append(f"Yellowing: {yellow_ratio*100:.1f}%")
        
        # 6. WILTING
        if black_ratio > 0.04 and green_ratio > 0.25:
            scores["wilting"] = 40 + (black_ratio * 200)
            detected_signals.append("Early structural collapse indicators")
        
        # 7. ROOT ROT
        if yellow_ratio > 0.06 and black_ratio > 0.02:
            scores["root_rot"] = 35 + (yellow_ratio * 120) + (black_ratio * 120)
            detected_signals.append("Compound yellowing and wilting markers")
        
        # 8. HOLES (Ultra-Sensitive)
        if black_ratio > 0.01 or texture_score > 0.03:
            scores["holes"] = 35 + (black_ratio * 200) + (texture_score * 50)
            detected_signals.append(f"Tiniest punctures or missing tissue: {black_ratio*100:.2f}%")
        
        # 9. CURLING
        if texture_score > 0.04 and green_ratio > 0.35:
            scores["curling"] = 30 + (texture_score * 250)
            detected_signals.append("Shape deformation detected")

        # 11. FRAIL LEAVES (New Signal)
        if low_sat_ratio > 0.20 and avg_brightness > 0.60 and green_ratio < 0.50:
            scores["frail"] = 40 + (low_sat_ratio * 150) + (high_bright_ratio * 50)
            detected_signals.append("Low saturation and thinning indicators")

        # 12. GENERAL DAMAGE (New Signal)
        if texture_score > 0.08 and brown_ratio < 0.02 and black_ratio < 0.02:
            scores["damaged"] = 35 + (texture_score * 150)
            detected_signals.append("Mechanical stress/tear indicators")
        
        # 10. HEALTHY (Requires higher purity now)
        if green_ratio > 0.65 and avg_saturation > 0.35:
            scores["healthy"] = 50 + (green_ratio * 60)
            if yellow_ratio < 0.02 and brown_ratio < 0.005 and white_ratio < 0.01:
                scores["healthy"] += 35
                detected_signals.append(f"Vibrant green coverage: {green_ratio*100:.1f}%")
                detected_signals.append("No anomalies detected even at high sensitivity")

        # ═══════════════════════════════════════════════════════════════
        # DETERMINE MULTIPLE DIAGNOSES
        # ═══════════════════════════════════════════════════════════════
        
        if not scores:
            return {
                "status": "success",
                "diagnosis": "Needs Closer Examination",
                "confidence": "Low",
                "signals": ["Insufficient visual data for confident diagnosis"],
                "metrics": {
                    "green": f"{green_ratio*100:.1f}%",
                    "yellow": f"{yellow_ratio*100:.1f}%",
                    "brown": f"{brown_ratio*100:.1f}%",
                    "white": f"{white_ratio*100:.1f}%",
                    "avg_brightness": f"{avg_brightness*100:.0f}%",
                    "avg_saturation": f"{avg_saturation*100:.0f}%"
                },
                "engine": "Python DeepScan v2.1 (Multi-Scan Enabled)"
            }
        
        # Sort scores by intensity
        sorted_conditions = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        # Filter: Significant detections only (Score > 40)
        significant_detections = [cond for cond, score in sorted_conditions if score >= 40]
        
        # If any real disease is detected, remove 'healthy' from detections
        if any(c != "healthy" for c in significant_detections) and "healthy" in significant_detections:
            significant_detections.remove("healthy")
            
        # If no significant detections met threshold, take top 1 regardless
        if not significant_detections:
            significant_detections = [sorted_conditions[0][0]]

        all_results = []
        for cond_id in significant_detections:
            symptom = SYMPTOM_DB[cond_id]
            conf = min(99, scores[cond_id])
            if final_metrics == center_analysis:
                conf = min(99, conf + 5)
                
            all_results.append({
                "id": cond_id,
                "name": symptom["name"],
                "emoji": symptom["emoji"],
                "severity": symptom["severity"],
                "confidence": f"{conf:.0f}%",
                "clues": symptom["clues"][:3],
                "advice": symptom["advice"],
                "treatment": symptom["treatment"]
            })

        # Primary diagnosis is the highest score
        primary = all_results[0]
        
        return {
            "status": "success",
            "diagnosis": primary["name"],
            "emoji": primary["emoji"],
            "severity": primary["severity"],
            "confidence": primary["confidence"],
            "signals": detected_signals[:5],  # Top signals
            "clues": primary["clues"],
            "advice": primary["advice"],
            "treatment": primary["treatment"],
            "all_detections": all_results, # New array for multi-disease
            "metrics": {
                "green": f"{green_ratio*100:.1f}%",
                "yellow": f"{yellow_ratio*100:.1f}%",
                "brown": f"{brown_ratio*100:.1f}%",
                "white": f"{white_ratio*100:.1f}%",
                "avg_brightness": f"{avg_brightness*100:.0f}%",
                "avg_saturation": f"{avg_saturation*100:.0f}%"
            },
            "engine": "Python DeepScan v2.1 (Multi-Scan Enabled)"
        }

    except Exception as e:
        return {"error": str(e), "status": "error"}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
    else:
        path = sys.argv[1]
        result = analyze_image(path)
        print(json.dumps(result, indent=2))
