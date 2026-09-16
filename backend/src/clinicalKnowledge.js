export const knowledge = {
  'No DR': {
    referable: false,
    recommendation: 'Continue routine diabetic eye screening at the interval advised by an eye-care professional.',
    english: 'No model-detected diabetic retinopathy pattern was found in this retinal image. A normal screening result does not replace regular eye examinations, especially for people with diabetes.',
    tamil: 'இந்த படத்தில் diabetic retinopathy குறிக்கும் மாற்றங்களை AI மாதிரி கண்டறியவில்லை. இது இறுதி மருத்துவ உறுதிப்படுத்தல் அல்ல. மருத்துவர் பரிந்துரைக்கும் கால இடைவெளியில் கண் பரிசோதனை தொடர வேண்டும்.'
  },
  'Mild DR': {
    referable: false,
    recommendation: 'Arrange a routine ophthalmology review and continue diabetes, blood-pressure and lipid control with your treating clinician.',
    english: 'The model suggests early diabetic-retinopathy changes. Mild disease can exist before a person notices any vision change, so regular specialist follow-up remains important.',
    tamil: 'இந்த திரையிடல் லேசான diabetic retinopathy மாற்றங்களை சுட்டிக்காட்டுகிறது. ஆரம்ப கட்டத்தில் பார்வை சாதாரணமாக இருந்தாலும் கண் மருத்துவர் மதிப்பீடு அவசியம்.'
  },
  'Moderate DR': {
    referable: true,
    recommendation: 'Book an ophthalmology assessment. Do not rely on this screening result alone to decide treatment.',
    english: 'The model suggests moderate diabetic-retinopathy changes. Retinal vascular damage may be more established, and professional review is recommended because progression can occur even when symptoms are limited.',
    tamil: 'இந்த திரையிடல் மிதமான diabetic retinopathy மாற்றங்களை சுட்டிக்காட்டுகிறது. ரெட்டினா ரத்த நாளங்களில் அதிக மாற்றங்கள் இருக்கலாம். கண் மருத்துவரிடம் மதிப்பீடு பெறுவது பரிந்துரைக்கப்படுகிறது.'
  },
  'Severe DR': {
    referable: true,
    recommendation: 'Seek prompt specialist ophthalmology assessment. A clinician should confirm the stage and decide whether additional imaging or treatment is needed.',
    english: 'The model suggests severe diabetic-retinopathy changes. This is a higher-risk stage and needs prompt specialist assessment to confirm severity and determine next steps.',
    tamil: 'இந்த திரையிடல் கடுமையான diabetic retinopathy மாற்றங்களை சுட்டிக்காட்டுகிறது. நோய் மேலும் முன்னேறும் அபாயம் அதிகமாக இருக்கலாம். விரைவாக கண் நிபுணரை அணுகவும்.'
  },
  'Proliferative DR': {
    referable: true,
    recommendation: 'Arrange urgent ophthalmology assessment. If there is sudden vision loss, new floaters, flashes or a curtain-like shadow, seek urgent eye care immediately.',
    english: 'The model suggests a proliferative diabetic-retinopathy pattern. This advanced stage can be sight-threatening and should be assessed urgently by an ophthalmologist.',
    tamil: 'இந்த திரையிடல் proliferative diabetic retinopathy போன்ற அதிக ஆபத்து மாற்றங்களை சுட்டிக்காட்டுகிறது. இது பார்வைக்கு ஆபத்தான நிலையாக இருக்கலாம். அவசரமாக கண் நிபுணர் மதிப்பீடு பெறவும்.'
  }
};

const aliases = new Map([
  ['normal', 'No DR'], ['none', 'No DR'], ['no dr', 'No DR'], ['0', 'No DR'],
  ['mild', 'Mild DR'], ['mild dr', 'Mild DR'], ['1', 'Mild DR'],
  ['moderate', 'Moderate DR'], ['moderate dr', 'Moderate DR'], ['2', 'Moderate DR'],
  ['severe', 'Severe DR'], ['severe dr', 'Severe DR'], ['3', 'Severe DR'],
  ['pdr', 'Proliferative DR'], ['proliferative', 'Proliferative DR'], ['proliferative dr', 'Proliferative DR'], ['4', 'Proliferative DR']
]);

export function normalizeClass(value, classIndex) {
  if (value != null) {
    const raw = String(value).trim();
    const alias = aliases.get(raw.toLowerCase());
    if (alias) return alias;
    if (knowledge[raw]) return raw;
  }
  if (classIndex != null) return ['No DR', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR'][Number(classIndex)] || null;
  return null;
}
