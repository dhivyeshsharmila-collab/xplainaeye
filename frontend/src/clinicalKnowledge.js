export const DR_KNOWLEDGE = {
  'No DR': {
    level: 'No visible DR',
    tone: 'low',
    short: 'The model did not identify a diabetic-retinopathy pattern in this retinal image.',
    meaning: 'No model-detected diabetic retinopathy changes were found in this screening image. A normal screening result does not replace regular dilated eye examinations, especially for people with diabetes.',
    signs: ['No stage-specific DR lesion pattern reported by the model', 'Continue monitoring for future retinal changes'],
    action: 'Continue routine diabetic eye screening at the interval advised by an eye-care professional.',
    urgency: 'Routine follow-up',
    tamil: 'இந்த படத்தில் diabetic retinopathy குறிக்கும் மாற்றங்களை AI மாதிரி கண்டறியவில்லை. இது இறுதி மருத்துவ உறுதிப்படுத்தல் அல்ல. நீரிழிவு நோயாளிகள் மருத்துவர் பரிந்துரைக்கும் கால இடைவெளியில் கண் பரிசோதனை தொடர வேண்டும்.'
  },
  'Mild DR': {
    level: 'Mild NPDR',
    tone: 'watch',
    short: 'The model suggests early diabetic-retinopathy changes.',
    meaning: 'Mild non-proliferative diabetic retinopathy is an early stage. Small retinal blood-vessel abnormalities can begin before a person notices any change in vision.',
    signs: ['Microaneurysm-like changes are commonly associated with this stage', 'Vision may still feel normal'],
    action: 'Arrange a routine ophthalmology review and continue diabetes, blood-pressure and lipid control with your treating clinician.',
    urgency: 'Routine specialist review',
    tamil: 'இந்த திரையிடல் லேசான diabetic retinopathy மாற்றங்களை சுட்டிக்காட்டுகிறது. ஆரம்ப கட்டத்தில் பார்வை சாதாரணமாக இருந்தாலும் சிறிய ரத்த நாள மாற்றங்கள் இருக்கலாம். கண் மருத்துவரிடம் வழக்கமான மதிப்பீடு செய்யவும்.'
  },
  'Moderate DR': {
    level: 'Moderate NPDR',
    tone: 'medium',
    short: 'The model suggests more established retinal changes that may need referral.',
    meaning: 'Moderate non-proliferative diabetic retinopathy means retinal vascular damage is more established than in the mild stage. Follow-up is important because the condition can progress even when symptoms are limited.',
    signs: ['Microaneurysms and retinal haemorrhage patterns can occur', 'Other vascular or exudative changes may be present', 'Macular involvement must be assessed separately by an eye-care professional'],
    action: 'Book an ophthalmology assessment. Do not rely on this screening result alone to decide treatment.',
    urgency: 'Referral recommended',
    tamil: 'இந்த திரையிடல் மிதமான diabetic retinopathy மாற்றங்களை சுட்டிக்காட்டுகிறது. ரெட்டினா ரத்த நாளங்களில் அதிக மாற்றங்கள் இருக்கலாம். கண் மருத்துவரிடம் மதிப்பீடு பெறுவது பரிந்துரைக்கப்படுகிறது.'
  },
  'Severe DR': {
    level: 'Severe NPDR',
    tone: 'high',
    short: 'The model suggests high-risk retinal changes.',
    meaning: 'Severe non-proliferative diabetic retinopathy is a high-risk stage in which widespread retinal vascular abnormalities may precede proliferative disease.',
    signs: ['More extensive haemorrhage or vascular-abnormality patterns can be associated', 'Risk of progression is higher than in mild or moderate stages'],
    action: 'Seek prompt specialist ophthalmology assessment. A clinician should confirm the stage and decide whether additional imaging or treatment is needed.',
    urgency: 'Prompt specialist assessment',
    tamil: 'இந்த திரையிடல் கடுமையான diabetic retinopathy மாற்றங்களை சுட்டிக்காட்டுகிறது. நோய் மேலும் முன்னேறும் அபாயம் அதிகமாக இருக்கலாம். விரைவாக கண் நிபுணரை அணுகவும்.'
  },
  'Proliferative DR': {
    level: 'Proliferative DR',
    tone: 'critical',
    short: 'The model suggests a potentially sight-threatening proliferative pattern.',
    meaning: 'Proliferative diabetic retinopathy is an advanced stage associated with abnormal new blood-vessel growth and a higher risk of serious vision complications.',
    signs: ['Abnormal new-vessel patterns are associated with this stage', 'Bleeding into the vitreous and traction-related complications can occur'],
    action: 'Arrange urgent ophthalmology assessment. If there is sudden vision loss, new floaters, flashes or a curtain-like shadow, seek urgent eye care immediately.',
    urgency: 'Urgent specialist assessment',
    tamil: 'இந்த திரையிடல் proliferative diabetic retinopathy போன்ற அதிக ஆபத்து மாற்றங்களை சுட்டிக்காட்டுகிறது. இது பார்வைக்கு ஆபத்தான நிலையாக இருக்கலாம். அவசரமாக கண் நிபுணர் மதிப்பீடு பெறவும்.'
  }
};

export function normalizeClass(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (['no dr', 'normal', 'none', '0'].includes(v)) return 'No DR';
  if (['mild', 'mild dr', '1'].includes(v)) return 'Mild DR';
  if (['moderate', 'moderate dr', '2'].includes(v)) return 'Moderate DR';
  if (['severe', 'severe dr', '3'].includes(v)) return 'Severe DR';
  if (['proliferative', 'proliferative dr', 'pdr', '4'].includes(v)) return 'Proliferative DR';
  return value;
}
