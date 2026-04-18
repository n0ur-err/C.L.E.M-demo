"""
Health Analyzer — Executive Edition
Comprehensive facial health indicator analysis using dlib 68-point landmarks.
All analysis is feature-derived; no random/simulated values.
"""

import numpy as np
from datetime import datetime
import time


class HealthAnalyzer:
    """Comprehensive facial health analyzer — executive-level reporting."""

    def __init__(self):
        self.analysis_time = 0
        self.fps = 0
        self.history = {
            'facial_symmetry': [], 'fatigue_score': [],
            'stress_score': [],    'skin_score': [],
        }
        self.history_max_size = 60

    # -------------------------------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------------------------------

    def analyze(self, features):
        t0 = time.time()
        data = {}
        if features and features.get('landmarks'):
            data.update(self._analyze_symmetry(features))
            data.update(self._analyze_fatigue(features))
            data.update(self._analyze_stress(features))
            data.update(self._analyze_skin(features))
            data.update(self._analyze_structure(features))
            data.update(self._analyze_circulation(features))
            data.update(self._analyze_proportions(features))
            data.update(self._compute_category_scores(data))
            self._update_history(data)
            if any(len(v) >= 10 for v in self.history.values()):
                data.update(self._analyze_trends())
        data["analysis_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.analysis_time = time.time() - t0
        self.fps = 1.0 / self.analysis_time if self.analysis_time > 0 else 0
        return data

    # -------------------------------------------------------------------------
    # 1. SYMMETRY
    # -------------------------------------------------------------------------

    def _analyze_symmetry(self, features):
        ind = {}
        lm = features.get("landmarks", [])
        if len(lm) < 68:
            return ind
        nose_x = lm[30][0]
        face_w = float(np.linalg.norm(np.array(lm[0]) - np.array(lm[16])))
        if face_w == 0:
            return ind
        pairs = [(36,45),(39,42),(37,44),(38,43),(17,26),(19,24),(21,22),(31,35),(48,54),(50,52),(1,15),(3,13),(5,11)]
        scores = []
        for li, ri in pairs:
            lp = np.array(lm[li]); rp = np.array(lm[ri])
            reflected = np.array([2*nose_x - rp[0], rp[1]])
            scores.append(float(np.linalg.norm(lp - reflected)) / face_w)
        overall = max(0.0, 1.0 - min(1.0, float(np.mean(scores)) * 3.5))
        ind["facial_symmetry"] = round(overall, 4)
        if overall >= 0.88:   ind["symmetry_evaluation"] = "Excellent symmetry"
        elif overall >= 0.75: ind["symmetry_evaluation"] = "Good symmetry"
        elif overall >= 0.62:
            ind["symmetry_evaluation"] = "Moderate asymmetry - common normal variation"
            ind["note_symmetry"] = "Mild facial asymmetry; may reflect habitual posture or muscle tone differences"
        else:
            ind["symmetry_evaluation"] = "Significant asymmetry"
            ind["note_symmetry"] = "Notable facial asymmetry; consider musculoskeletal review if new onset"
        sym = features.get("symmetry", {})
        if "eyes_level" in sym:
            el = float(sym["eyes_level"])
            ind["eyes_level_symmetry"] = round(el, 4)
            if el < 0.80: ind["note_eye_level"] = "Eye-level difference - possible postural/musculoskeletal factor"
        nm = features.get("nose_metrics", {})
        if "nose_deviation" in nm:
            dev = abs(float(nm["nose_deviation"]))
            ind["nose_deviation"] = round(dev, 4)
            if dev > 0.04: ind["nose_deviation_note"] = "Nasal tip deviation from midline detected"
        jm = features.get("jaw_metrics", {})
        if "chin_deviation" in jm:
            cd = abs(float(jm["chin_deviation"]))
            ind["chin_deviation"] = round(cd, 4)
            if cd > 0.04: ind["jaw_alignment_note"] = "Mild chin deviation - may indicate jaw asymmetry"
        return ind

    # -------------------------------------------------------------------------
    # 2. FATIGUE & EYE HEALTH
    # -------------------------------------------------------------------------

    def _analyze_fatigue(self, features):
        ind = {}
        em = features.get("eye_metrics", {})
        if not em:
            lm = features.get("landmarks", [])
            if len(lm) >= 48: em = self._ear_from_landmarks(lm)
        if "avg_ear" in em:
            ear = float(em["avg_ear"])
            ind["eye_aspect_ratio"] = round(ear, 4)
            ind["left_ear"]  = round(float(em.get("left_ear",  ear)), 4)
            ind["right_ear"] = round(float(em.get("right_ear", ear)), 4)
            if   ear < 0.18: ind["eye_fatigue"] = "Severe";   ind["eye_health_note"] = "Eyes nearly closed - severe fatigue/drowsiness"
            elif ear < 0.22: ind["eye_fatigue"] = "Moderate"; ind["eye_health_note"] = "Significant fatigue - rest recommended"
            elif ear < 0.27: ind["eye_fatigue"] = "Mild";     ind["eye_health_note"] = "Mild fatigue - take screen breaks"
            else:            ind["eye_fatigue"] = "Minimal";  ind["eye_health_note"] = "Eyes appear alert and well-rested"
        if "ear_asymmetry" in em:
            asym = float(em["ear_asymmetry"])
            ind["ear_asymmetry"] = round(asym, 4)
            if   asym > 0.25: ind["ear_asymmetry_note"] = "Significant eye-openness asymmetry - possible ptosis or unilateral fatigue"
            elif asym > 0.15: ind["ear_asymmetry_note"] = "Mild eye-openness asymmetry - monitor if persistent"
            else:             ind["ear_asymmetry_note"] = "Symmetric eye openness"
        if "left_height" in em:  ind["left_eye_openness_px"]  = round(float(em["left_height"]), 2)
        if "right_height" in em: ind["right_eye_openness_px"] = round(float(em["right_height"]), 2)
        bm = features.get("eyebrow_metrics", {})
        if "avg_brow_height" in bm:
            bh = float(bm["avg_brow_height"])
            ind["brow_height_ratio"] = round(bh, 4)
            if   bh < 0.07: ind["brow_position_note"] = "Heavy/low brow - fatigue or strong expression"
            elif bh < 0.10: ind["brow_position_note"] = "Slightly low brow - mild fatigue"
            else:           ind["brow_position_note"] = "Normal brow elevation"
        return ind

    def _ear_from_landmarks(self, lm):
        def ear(pts):
            A = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
            B = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
            C = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
            return float((A+B)/(2.0*C)) if C > 0 else 0.28
        le = ear([lm[i] for i in range(36,42)])
        re = ear([lm[i] for i in range(42,48)])
        avg = (le+re)/2
        return {"left_ear":le,"right_ear":re,"avg_ear":avg,"ear_asymmetry":abs(le-re)/avg if avg>0 else 0}

    # -------------------------------------------------------------------------
    # 3. STRESS & TENSION
    # -------------------------------------------------------------------------

    def _analyze_stress(self, features):
        ind = {}
        bm = features.get("eyebrow_metrics", {})
        mm = features.get("mouth_metrics", {})
        jm = features.get("jaw_metrics", {})
        signals = []
        if "inner_brow_distance" in bm:
            ibd = float(bm["inner_brow_distance"])
            ind["inner_brow_distance"] = round(ibd, 4)
            if   ibd < 0.07: ind["brow_furrow_note"] = "Brow furrowing - strong stress/concentration"; signals.append(0.85)
            elif ibd < 0.11: ind["brow_furrow_note"] = "Mild brow tension - moderate focus or stress";  signals.append(0.45)
            else:            ind["brow_furrow_note"] = "Relaxed brow - no furrowing";                   signals.append(0.10)
        if "brow_asymmetry" in bm:
            ba = float(bm["brow_asymmetry"])
            ind["brow_asymmetry"] = round(ba, 4)
            if ba > 0.04: signals.append(0.35)
        if "left_brow_arch" in bm:
            arch = (float(bm.get("left_brow_arch",0)) + float(bm.get("right_brow_arch",0))) / 2
            ind["brow_arch"] = round(arch, 4)
            if arch > 0.06: ind["brow_raise_note"] = "Raised brow arch - possible alertness or surprise"
        if "mar" in mm:
            mar = float(mm["mar"])
            ind["mouth_aspect_ratio"] = round(mar, 4)
            if   mar < 0.02: ind["lip_tension_note"] = "Lips tightly compressed - tension indicator"; signals.append(0.80)
            elif mar < 0.06: ind["lip_tension_note"] = "Mild lip compression - possible tension";     signals.append(0.40)
            else:            ind["lip_tension_note"] = "Normal lip posture - relaxed mouth";          signals.append(0.10)
        if "smile_index" in mm:
            si = float(mm["smile_index"])
            ind["smile_index"] = round(si, 4)
            if   si >  0.025: ind["mouth_expression"] = "Upturned corners - positive/smile"; signals.append(0.05)
            elif si < -0.025: ind["mouth_expression"] = "Downturned corners - tense/negative"; signals.append(0.55)
            else:             ind["mouth_expression"] = "Neutral mouth posture"; signals.append(0.20)
        if "jaw_angle" in jm:
            ja = float(jm["jaw_angle"])
            ind["jaw_angle"] = round(ja, 1)
            if   ja < 95:  ind["jaw_tension_note"] = "Acute jaw angle - possible clenching/bruxism"; signals.append(0.65)
            elif ja < 110: ind["jaw_tension_note"] = "Moderate jaw angle - normal range"; signals.append(0.20)
            else:          ind["jaw_tension_note"] = "Open jaw angle - relaxed posture"; signals.append(0.05)
        if signals:
            sc = float(np.mean(signals))
            ind["stress_composite"] = round(sc, 3)
            if   sc > 0.60: ind["stress_level"] = "High";     ind["stress_note"] = "Multiple tension indicators - consider relaxation techniques"
            elif sc > 0.35: ind["stress_level"] = "Moderate"; ind["stress_note"] = "Moderate tension - normal during focused work"
            else:           ind["stress_level"] = "Low";      ind["stress_note"] = "Relaxed facial posture detected"
        return ind

    # -------------------------------------------------------------------------
    # 4. SKIN HEALTH
    # -------------------------------------------------------------------------

    def _analyze_skin(self, features):
        ind = {}
        skin    = features.get("skin", {})
        regions = features.get("skin_regions", {})
        if "texture" in skin:
            tex = float(skin["texture"])
            ind["skin_texture"] = round(tex, 2)
            if   tex > 100: ind["texture_note"] = "High texture variance - possible dryness or irritation"
            elif tex > 50:  ind["texture_note"] = "Elevated texture - mild dehydration or normal variation"
            elif tex > 15:  ind["texture_note"] = "Normal skin texture"
            else:           ind["texture_note"] = "Smooth skin surface - well-hydrated"
        if "skin_tone" in skin:
            t   = skin["skin_tone"]
            hue = float(t.get("hue", 0)); sat = float(t.get("saturation",0)); val = float(t.get("value",150))
            ind["skin_hue"] = round(hue,1); ind["skin_saturation"] = round(sat,1); ind["skin_brightness"] = round(val,1)
            if   val < 90: ind["skin_tone_note"] = "Dark/low brightness - lighting or pigmentation"
            elif sat < 30 and val < 155: ind["skin_tone_note"] = "Pale complexion - possible reduced circulation/anaemia indicator"
            elif 18 <= hue <= 42 and sat > 85: ind["skin_tone_note"] = "Yellowish tint - possible bilirubin/jaundice screening indicator"
            elif (hue <= 8 or hue >= 170) and sat > 85: ind["skin_tone_note"] = "Elevated redness - inflammation, rosacea or exertion"
            else: ind["skin_tone_note"] = "Normal skin tone variation"
        if regions:
            summary = {}; textures=[]; redness_vals=[]; yellow_vals=[]; bright_vals=[]
            for rname, rd in regions.items():
                if not isinstance(rd, dict) or not rd: continue
                summary[rname] = {"brightness":rd.get("brightness",0),"redness":rd.get("redness",0),"yellowness":rd.get("yellowness",0),"texture":rd.get("texture",0)}
                textures.append(rd.get("texture",0)); redness_vals.append(rd.get("redness",0))
                yellow_vals.append(rd.get("yellowness",0)); bright_vals.append(rd.get("brightness",0))
            ind["skin_regions_summary"] = summary
            if textures:    ind["avg_regional_texture"] = round(float(np.mean(textures)), 2)
            if redness_vals:
                max_r = max(redness_vals); ind["peak_redness"] = round(float(max_r), 1)
                ind["redness_note"] = "Elevated redness in one or more regions" if max_r > 45 else "Redness within normal range"
            if yellow_vals:
                avg_y = float(np.mean(yellow_vals)); ind["avg_yellowness"] = round(avg_y, 1)
                ind["jaundice_screen"] = "Yellowish tint elevated - consider liver/bilirubin assessment" if avg_y > 145 else "No significant jaundice indicators"
            if bright_vals:
                avg_b = float(np.mean(bright_vals)); std_b = float(np.std(bright_vals))
                ind["avg_skin_brightness"] = round(avg_b, 1); ind["skin_uniformity"] = round(std_b, 1)
                if   avg_b < 85:  ind["pallor_screen"] = "Low skin brightness - possible pallor; consider circulation/haemoglobin check"
                elif avg_b < 120: ind["pallor_screen"] = "Slightly reduced brightness - monitor and hydrate"
                else:             ind["pallor_screen"] = "Normal skin brightness - no pallor indicators"
                if   std_b > 32: ind["uniformity_note"] = "High brightness variation - possible uneven tone or hyperpigmentation"
                elif std_b > 18: ind["uniformity_note"] = "Moderate regional variation - may be lighting-related"
                else:            ind["uniformity_note"] = "Uniform skin tone across facial regions"
        bri = ind.get("skin_brightness", ind.get("avg_skin_brightness", 150))
        ind["skin_hydration_estimate"] = round(float(min(1.0, bri/220.0)), 3)
        if   ind["skin_hydration_estimate"] < 0.50: ind["hydration_note"] = "Skin may appear dry - increase fluid intake"
        elif ind["skin_hydration_estimate"] > 0.70: ind["hydration_note"] = "Good skin hydration indicators"
        else:                                          ind["hydration_note"] = "Adequate hydration appearance"
        return ind

    # -------------------------------------------------------------------------
    # 5. STRUCTURAL HARMONY
    # -------------------------------------------------------------------------

    def _analyze_structure(self, features):
        ind = {}
        ratios  = features.get("facial_ratios", {})
        jm      = features.get("jaw_metrics", {})
        nm      = features.get("nose_metrics", {})
        metrics = features.get("metrics", {})
        fs = features.get("face_shape", "")
        if fs:
            ind["face_shape"] = fs
            notes = {"oval":"Oval - well-balanced proportions","round":"Round - equal width and height","oblong":"Oblong - notably longer than wide","square":"Square - strong jaw with balanced width","heart":"Heart - wider forehead tapering to narrower jaw","diamond":"Diamond - prominent cheekbones"}
            ind["face_shape_note"] = notes.get(fs, "")
        if "top_golden_ratio_diff" in ratios:
            diff = float(ratios["top_golden_ratio_diff"])
            harmony = max(0.0, 1.0 - min(1.0, diff/1.618))
            ind["golden_ratio_harmony"] = round(harmony, 4); ind["golden_ratio_diff"] = round(diff, 4)
            if   harmony > 0.80: ind["golden_ratio_note"] = "Strong golden-ratio alignment in facial thirds"
            elif harmony > 0.60: ind["golden_ratio_note"] = "Moderate golden-ratio alignment"
            else:                ind["golden_ratio_note"] = "Facial thirds diverge from golden ratio - common variation"
        for k in ("top_third_ratio","middle_third_ratio"):
            if k in ratios: ind[k] = round(float(ratios[k]), 3)
        if "eye_spacing_ratio" in ratios:
            esr = float(ratios["eye_spacing_ratio"]); ind["eye_spacing_ratio"] = round(esr, 3)
            if   esr < 0.80: ind["eye_spacing_note"] = "Close-set eye appearance"
            elif esr > 1.20: ind["eye_spacing_note"] = "Wide-set eye appearance"
            else:            ind["eye_spacing_note"] = "Normal inter-ocular spacing"
        if "jaw_width_ratio" in jm:
            jwr = float(jm["jaw_width_ratio"]); ind["jaw_width_ratio"] = round(jwr, 3)
            if   jwr > 0.88: ind["jaw_note"] = "Wide jaw - strong jaw structure"
            elif jwr < 0.65: ind["jaw_note"] = "Narrow jaw - tapered lower face"
            else:            ind["jaw_note"] = "Proportionate jaw width"
        if "chin_height_ratio" in jm: ind["chin_height_ratio"] = round(float(jm["chin_height_ratio"]), 3)
        if "nose_width_ratio" in nm:
            nwr = float(nm["nose_width_ratio"]); ind["nose_width_ratio"] = round(nwr, 3)
            if nwr > 0.80: ind["nose_note"] = "Wider nasal proportions"
            elif nwr < 0.52: ind["nose_note"] = "Narrow nasal proportions"
            else: ind["nose_note"] = "Average nasal proportions"
        if "nose_length" in nm: ind["nose_length_px"] = round(float(nm["nose_length"]), 1)
        if "nose_width"  in nm: ind["nose_width_px"]  = round(float(nm["nose_width"]),  1)
        if "face_width_height_ratio" in metrics: ind["face_width_height_ratio"] = round(float(metrics["face_width_height_ratio"]), 3)
        if "face_width" in metrics and "face_height" in metrics:
            fw = float(metrics["face_width"]); fh = float(metrics["face_height"]); fp = 2*(fw+fh)
            if fp > 0:
                ff = min(1.0, (fw*fh)/(fp*fp)*1000); ind["facial_fullness"] = round(ff, 3)
                if   ff < 0.30: ind["fullness_evaluation"] = "Low facial fullness - may relate to low body weight"
                elif ff < 0.70: ind["fullness_evaluation"] = "Moderate facial fullness - within healthy range"
                else:           ind["fullness_evaluation"] = "High facial fullness - may indicate fluid retention"
        return ind

    # -------------------------------------------------------------------------
    # 6. CIRCULATORY SCREENING
    # -------------------------------------------------------------------------

    def _analyze_circulation(self, features):
        ind = {}
        lc = features.get("lip_color", {})
        if not lc: return ind
        r=float(lc.get("r",150)); g=float(lc.get("g",100)); b=float(lc.get("b",100))
        hue=float(lc.get("hue",0)); sat=float(lc.get("saturation",0)); bri=float(lc.get("brightness",150))
        ri=float(lc.get("redness_index", r-(g+b)/2))
        ind["lip_redness_index"]=round(ri,1); ind["lip_brightness"]=round(bri,1)
        ind["lip_hue"]=round(hue,1); ind["lip_saturation"]=round(sat,1)
        ind["lip_rgb"]={"r":round(r,1),"g":round(g,1),"b":round(b,1)}
        if bri < 100 and ri < 18: ind["lip_color_note"] = "Pale lips - possible reduced haemoglobin or circulation (anaemia screen)"
        elif ri < 15: ind["lip_color_note"] = "Low lip redness - possible nutritional/circulatory factors"
        elif ri > 55: ind["lip_color_note"] = "Well-vascularised lips - healthy lip colour"
        else:         ind["lip_color_note"] = "Normal lip colouration"
        ind["cyanosis_screen"]     = "Blue tint in lip region - cardiovascular/oxygenation assessment recommended" if (95 <= hue <= 135 and sat > 45) else "No cyanosis indicators"
        ind["lip_jaundice_screen"] = "Yellowish lip tint - complements jaundice screen" if (18 <= hue <= 42 and sat > 55) else "Normal lip tone - no jaundice indicators"
        return ind

    # -------------------------------------------------------------------------
    # 7. PROPORTIONS
    # -------------------------------------------------------------------------

    def _analyze_proportions(self, features):
        ind = {}
        mm=features.get("mouth_metrics",{}); nm=features.get("nose_metrics",{}); metrics=features.get("metrics",{})
        if "upper_lip_height" in mm and mm.get("mouth_width",0) > 0:
            ul=float(mm["upper_lip_height"]); ll=float(mm.get("lower_lip_height",0)); mw=float(mm["mouth_width"])
            lf=(ul+ll)/mw; ind["lip_fullness_ratio"]=round(lf,4)
            if lf < 0.12: ind["lip_fullness_note"] = "Thin lips - possible dehydration or age factor"
            elif lf > 0.35: ind["lip_fullness_note"] = "Full lips - well-hydrated appearance"
            else: ind["lip_fullness_note"] = "Average lip fullness"
        if "mouth_width" in mm and metrics.get("face_width",0) > 0:
            ind["mouth_face_ratio"] = round(float(mm["mouth_width"])/float(metrics["face_width"]),3)
        if "nose_length" in nm and metrics.get("face_height",0) > 0:
            ind["nose_face_ratio"] = round(float(nm["nose_length"])/float(metrics["face_height"]),3)
        return ind

    # -------------------------------------------------------------------------
    # 8. CATEGORY SCORES (0-10)
    # -------------------------------------------------------------------------

    def _compute_category_scores(self, data):
        s = {}
        sym=float(data.get("facial_symmetry",0.80)); el=float(data.get("eyes_level_symmetry",0.90))
        ndv=min(1.0,float(data.get("nose_deviation",0))/0.08); cdv=min(1.0,float(data.get("chin_deviation",0))/0.08)
        s["symmetry_score"]   = round(min(10,(sym*0.5+el*0.3+(1-ndv)*0.1+(1-cdv)*0.1)*10),1)
        fm={"Minimal":1.0,"Mild":0.80,"Moderate":0.50,"Severe":0.15}
        fv=fm.get(data.get("eye_fatigue","Mild"),0.70); ea=min(1.0,float(data.get("ear_asymmetry",0))/0.30)
        bh=min(1.0,float(data.get("brow_height_ratio",0.10))/0.12)
        s["fatigue_score"]     = round(min(10,(fv*0.60+(1-ea)*0.20+bh*0.20)*10),1)
        sc=float(data.get("stress_composite",0.30)); s["stress_score"] = round(min(10,(1.0-sc)*10),1)
        tex=float(data.get("skin_texture",25)); ts=max(0,min(1,(100-tex)/100))
        bri=float(data.get("skin_brightness",data.get("avg_skin_brightness",150))); bs=max(0,min(1,(bri-80)/130))
        unif=float(data.get("skin_uniformity",12)); us=max(0,min(1,(40-unif)/40))
        s["skin_score"]        = round(min(10,(ts*0.40+bs*0.30+us*0.30)*10),1)
        gh=float(data.get("golden_ratio_harmony",0.70)); cd2=min(1.0,float(data.get("chin_deviation",0))/0.06)
        s["structural_score"]  = round(min(10,(gh*0.70+(1-cd2)*0.30)*10),1)
        ri=float(data.get("lip_redness_index",30)); cis=min(1.0,ri/60.0)
        lb=float(data.get("lip_brightness",150)); lbs=max(0,min(1,(lb-80)/130))
        s["circulation_score"] = round(min(10,(cis*0.55+lbs*0.45)*10),1)
        s["overall_composite_score"] = round(float(np.mean([s["symmetry_score"],s["fatigue_score"],s["stress_score"],s["skin_score"],s["structural_score"]])),1)
        return s

    # -------------------------------------------------------------------------
    # HISTORY & TRENDS
    # -------------------------------------------------------------------------

    def _update_history(self, data):
        for sk, hk in [("facial_symmetry","facial_symmetry"),("fatigue_score","fatigue_score"),("stress_score","stress_score"),("skin_score","skin_score")]:
            v = data.get(sk)
            if v is not None and isinstance(v,(int,float)):
                self.history[hk].append(float(v))
                if len(self.history[hk]) > self.history_max_size: self.history[hk].pop(0)

    def _analyze_trends(self):
        trends = {}
        for label, key in [("fatigue_trend","fatigue_score"),("stress_trend","stress_score"),("symmetry_trend","facial_symmetry"),("skin_trend","skin_score")]:
            arr = self.history.get(key, [])
            if len(arr) >= 10:
                rc=float(np.mean(arr[-5:])); ea=float(np.mean(arr[:5])); d=rc-ea
                trends[label] = "Stable" if abs(d)<0.4 else ("Improving" if d>0 else "Declining")
        return trends

    def get_processing_stats(self):
        return {"analysis_time_ms":round(self.analysis_time*1000,1),"fps":round(self.fps,1)}
