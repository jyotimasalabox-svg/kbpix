/**
 * PhotoResize Pro — Verified Indian Government Exam & Portal Preset Database
 * Official photo & signature specifications with custom preset creator
 */

const VERIFIED_GOVT_PRESETS = [
  // SSC
  {
    id: "ssc_photo",
    category: "SSC",
    title: "SSC CGL / CHSL / MTS Photo",
    portal: "ssc.gov.in",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 20,
    maxKB: 50,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "White/light background. Spectacles/cap not allowed. Recent photo."
  },
  {
    id: "ssc_sign",
    category: "SSC",
    title: "SSC Signature",
    portal: "ssc.gov.in",
    widthPx: 472,
    heightPx: 236,
    widthCm: 4.0,
    heightCm: 2.0,
    minKB: 10,
    maxKB: 20,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Black ink on plain white paper. Clear crop."
  },

  // UPSC
  {
    id: "upsc_photo",
    category: "UPSC",
    title: "UPSC Civil Services / NDA Photo",
    portal: "upsconline.nic.in",
    widthPx: 350,
    heightPx: 350,
    widthCm: 3.5,
    heightCm: 3.5,
    minKB: 20,
    maxKB: 300,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Candidate name and date of photo printed at bottom is mandatory."
  },
  {
    id: "upsc_sign",
    category: "UPSC",
    title: "UPSC Signature",
    portal: "upsconline.nic.in",
    widthPx: 350,
    heightPx: 350,
    widthCm: 3.5,
    heightCm: 3.5,
    minKB: 20,
    maxKB: 300,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Dark black/blue ink on white paper."
  },

  // RPSC
  {
    id: "rpsc_photo",
    category: "RPSC",
    title: "RPSC RAS / Teacher Photo",
    portal: "sso.rajasthan.gov.in",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 50,
    maxKB: 100,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Light plain background. High resolution."
  },
  {
    id: "rpsc_sign",
    category: "RPSC",
    title: "RPSC Signature",
    portal: "sso.rajasthan.gov.in",
    widthPx: 700,
    heightPx: 300,
    widthCm: 6.0,
    heightCm: 2.5,
    minKB: 20,
    maxKB: 50,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Clear black pen signature."
  },

  // Railway (RRB)
  {
    id: "rrb_photo",
    category: "Railway",
    title: "RRB NTPC / Group D Photo",
    portal: "rrbapply.gov.in",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 30,
    maxKB: 70,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Color passport photo with white background."
  },
  {
    id: "rrb_sign",
    category: "Railway",
    title: "RRB Signature",
    portal: "rrbapply.gov.in",
    widthPx: 590,
    heightPx: 236,
    widthCm: 5.0,
    heightCm: 2.0,
    minKB: 30,
    maxKB: 70,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Running handwriting signature (not in capital letters)."
  },

  // Police Recruitment
  {
    id: "police_photo",
    category: "Police",
    title: "Police Constable / SI Photo",
    portal: "State Police Recruitment",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 20,
    maxKB: 50,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "White background, straight frontal biometric view."
  },
  {
    id: "police_sign",
    category: "Police",
    title: "Police Recruitment Signature",
    portal: "State Police Recruitment",
    widthPx: 472,
    heightPx: 236,
    widthCm: 4.0,
    heightCm: 2.0,
    minKB: 10,
    maxKB: 20,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Dark ink on white paper."
  },

  // Banking (IBPS / SBI)
  {
    id: "ibps_photo",
    category: "Banking",
    title: "IBPS / SBI PO & Clerk Photo",
    portal: "ibps.in",
    widthPx: 200,
    heightPx: 230,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 20,
    maxKB: 50,
    format: "image/jpeg",
    dpi: 200,
    verified: true,
    notes: "Dimensions: 200 x 230 pixels preferred."
  },
  {
    id: "ibps_sign",
    category: "Banking",
    title: "IBPS / SBI Signature",
    portal: "ibps.in",
    widthPx: 140,
    heightPx: 60,
    widthCm: 3.5,
    heightCm: 1.5,
    minKB: 10,
    maxKB: 20,
    format: "image/jpeg",
    dpi: 200,
    verified: true,
    notes: "Signature in capital letters is NOT accepted."
  },
  {
    id: "ibps_thumb",
    category: "Banking",
    title: "IBPS Left Thumb Impression (LTI)",
    portal: "ibps.in",
    widthPx: 240,
    heightPx: 240,
    widthCm: 3.0,
    heightCm: 3.0,
    minKB: 20,
    maxKB: 50,
    format: "image/jpeg",
    dpi: 200,
    verified: true,
    notes: "Blue/Black ink stamp pad on white paper."
  },

  // NEET / JEE
  {
    id: "neet_photo",
    category: "NTA",
    title: "NTA NEET / JEE Main Photo",
    portal: "neet.nta.nic.in",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 10,
    maxKB: 200,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "White background with 80% face coverage showing ears."
  },
  {
    id: "neet_postcard",
    category: "NTA",
    title: "NTA NEET Postcard Photo (4x6)",
    portal: "neet.nta.nic.in",
    widthPx: 1200,
    heightPx: 1800,
    widthCm: 10.16,
    heightCm: 15.24,
    minKB: 10,
    maxKB: 200,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Postcard size (4 x 6 inch) photo with candidate name & date."
  },

  // PAN & Aadhaar
  {
    id: "pan_photo",
    category: "Identity",
    title: "NSDL / UTI PAN Card Photo",
    portal: "onlineservices.nsdl.com",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 20,
    maxKB: 50,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Resolution 300 DPI strictly required by NSDL portal."
  },
  {
    id: "pan_sign",
    category: "Identity",
    title: "NSDL / UTI PAN Card Signature",
    portal: "onlineservices.nsdl.com",
    widthPx: 531,
    heightPx: 236,
    widthCm: 4.5,
    heightCm: 2.0,
    minKB: 10,
    maxKB: 20,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Clear black signature on plain white paper."
  },
  {
    id: "aadhaar_doc",
    category: "Identity",
    title: "Aadhaar Proof Document Image",
    portal: "myaadhaar.uidai.gov.in",
    widthPx: 1200,
    heightPx: 1600,
    widthCm: 21.0,
    heightCm: 29.7,
    minKB: 50,
    maxKB: 500,
    format: "image/jpeg",
    dpi: 200,
    verified: true,
    notes: "Under 500 KB image or PDF proof for UIDAI updates."
  },

  // School / College Admission
  {
    id: "admission_photo",
    category: "Admission",
    title: "School / College Admission Photo",
    portal: "College & University Portals",
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKB: 20,
    maxKB: 100,
    format: "image/jpeg",
    dpi: 300,
    verified: true,
    notes: "Standard 3.5 x 4.5 cm color passport photograph."
  }
];

class GovtPresetsManager {
  constructor() {
    this.customPresetsKey = 'photo_custom_govt_presets';
  }

  getAllPresets() {
    const custom = this.getCustomPresets();
    return [...VERIFIED_GOVT_PRESETS, ...custom];
  }

  getCustomPresets() {
    try {
      const saved = localStorage.getItem(this.customPresetsKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveCustomPreset(preset) {
    const custom = this.getCustomPresets();
    preset.id = 'custom_' + Date.now();
    preset.category = 'Custom';
    preset.verified = false;
    custom.push(preset);
    localStorage.setItem(this.customPresetsKey, JSON.stringify(custom));
    return preset;
  }

  deleteCustomPreset(id) {
    let custom = this.getCustomPresets();
    custom = custom.filter(p => p.id !== id);
    localStorage.setItem(this.customPresetsKey, JSON.stringify(custom));
  }

  getPresetById(id) {
    return this.getAllPresets().find(p => p.id === id) || null;
  }
}

window.GovtPresets = new GovtPresetsManager();
