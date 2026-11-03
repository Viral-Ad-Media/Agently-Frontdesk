// The customer site's words for each trade: nav button, how-it-works steps, the three promises and the footer
// line. Roofing and med spa keep the copy they shipped with; the newer trades get their own in the same voice.
const ROOFING = {
  features: [
    ["Damage outlined on your photo", "We draw the damaged area and measure it when something of known size is in frame."],
    ["Storm check-ins", "When a weather-service storm warning covers your street, we check on you first."],
    ["Insurance claim pack", "A draft pack with the weather on record, your outlined photo and the estimate, ready to print."],
    ["See it fixed", "A picture of your own roof after the repair, clearly marked as an illustration."],
  ],
  nav: "Describe your roof problem",
  ask: "Describe the roof problem",
  howLead: "From a leak to a booked inspection, in minutes, with a person approving every price before you see it.",
  steps: [
    ["Describe it and add a photo", "Tell us what's happening and where. Then one photo of the damage, with something of known size in frame if you can."],
    ["See the damage outlined", "We draw the damaged area on your photo, name what failed and say how bad it is, with our confidence shown."],
    ["Get a draft range", "Materials and labour at our published rates, as a range. A roofer confirms the final price on site."],
    ["Book the inspection", "Pick a real slot from our calendar in three taps. No account, no forms."],
  ],
  points: [
    ["Seconds", "First answer", "You're heard straight away, even while the crew is on a roof."],
    ["Shown", "Our working", "The outline, the finding, the measurement basis and the quote maths are all on the card."],
    ["Human", "Final say", "Nothing is sent to you without a person at the desk approving it first."],
  ],
  whyTitle: "Describe the problem. Add a photo. That's it.",
  whyText: "No account, no form. A draft range and an inspection slot in a few minutes.",
  footer: "Show us the damage. We'll tell you what it is, roughly what it costs, and when we can come.",
};

const MEDSPA = {
  features: [
    ["Consent first", "Nothing is uploaded until you agree, and you can always skip the photo."],
    ["Matched to our menu", "Your concern is matched to the treatments we actually offer, with the published price."],
    ["Clinician review", "A clinician reads your notes and flags anything to check with you. Never a diagnosis."],
    ["Aftercare reminders", "After your visit, a short aftercare note, written for you and approved by the clinic."],
  ],
  nav: "Ask about a treatment",
  ask: "What would you like help with",
  howLead: "From a question to a booked consultation, in minutes, with a person deciding every step that matters.",
  steps: [
    ["Tell us what you've noticed", "A sentence is enough. If you'd like to share a photo, you confirm consent first; it's optional."],
    ["See it matched to our services", "We note the area in your photo and match your concern to the treatments we actually offer, with the published price range."],
    ["A clinician reviews before anything is offered", "Nothing is recommended by software. A clinician reads your notes and flags anything to check with you."],
    ["Book your consultation", "Pick a real time from our calendar in three taps. No account, no forms."],
  ],
  points: [
    ["Seconds", "First answer", "You're heard straight away, even while the clinicians are with clients."],
    ["Honest", "Never a diagnosis", "We match what you describe to our own services and nothing more. No promises, no medical claims."],
    ["Human", "Final say", "A clinician approves every plan and every price before you see it."],
  ],
  whyTitle: "Tell us what you've noticed. That's it.",
  whyText: "No account, no form. A matched service, a price range and a consultation time in a few minutes.",
  footer: "Tell us what you've noticed. We'll match it to our services, share the price range, and book you with a clinician.",
};

const PLUMBING = {
  features: [
    ["Emergencies first", "Gas, bursts, flooding or water near electrics: you get what to do right now and a call back."],
    ["Freeze alerts", "When a hard freeze is forecast for your area, we check in before your pipes split."],
    ["Matched to our menu", "Leak, drain, water heater or burst pipe: matched to the jobs we do, with our published price."],
    ["A real visit time", "Pick a slot from our live calendar. It's never offered to anyone else."],
  ],
  nav: "Tell us what's leaking",
  ask: "Describe the plumbing problem",
  howLead: "From a drip to a booked plumber, in minutes. Anything dangerous goes straight to a person.",
  steps: [
    ["Tell us what's going on", "What's leaking, blocked or not working, and since when. A photo of the leak or the fixture helps, but it's optional."],
    ["See it matched to our services", "We match it to the jobs we actually do, with our published price range. Nothing is invented."],
    ["Safety first", "A gas smell, a burst pipe, flooding or water near electrics goes straight to a person, with what to do right now."],
    ["Book the plumber", "Pick a real visit time from our calendar in three taps. No account, no forms."],
  ],
  points: [
    ["Seconds", "First answer", "You're heard straight away, even while every plumber is under a sink."],
    ["Safe", "Emergencies first", "Gas, bursts and flooding are flagged by a fixed rule, not left to a guess."],
    ["Human", "Final say", "A person at the desk approves every price before you see it."],
  ],
  whyTitle: "Describe it. Add a photo if you can. That's it.",
  whyText: "No account, no form. A matched service, our price range and a visit time in a few minutes.",
  footer: "Tell us what's leaking or blocked. We'll match it to our services, share the price range and book a plumber.",
};

const HVAC = {
  features: [
    ["Label and error code read", "Snap the model plate or the display and we note the code exactly as printed."],
    ["Heat alerts", "When a heat warning covers your area, we check your AC is ready before it's needed."],
    ["Safety first", "A burning smell, smoke or sparks: switch it off at the breaker, and a person calls you."],
    ["A real visit time", "Pick a technician slot from our live calendar."],
  ],
  nav: "Tell us what's not cooling",
  ask: "Describe the AC or appliance problem",
  howLead: "From a warm house or a warm fridge to a booked technician, in minutes. Anything unsafe goes to a person first.",
  steps: [
    ["Tell us what it's doing", "The AC, the fridge or another appliance, and what's wrong. A photo of the unit, its label or the error code helps."],
    ["We read the label and the code", "If your photo shows a model plate or an error code, we read it as printed and note it for the technician. We never guess a code."],
    ["See it matched to our services", "We match it to the repairs we actually do, with our published price range."],
    ["Book the technician", "Pick a real visit time from our calendar in three taps. No account, no forms."],
  ],
  points: [
    ["Seconds", "First answer", "You're heard straight away, even on the hottest day of the year."],
    ["Read", "Not guessed", "Model labels and error codes are read from your photo, and said so."],
    ["Human", "Final say", "A person at the desk approves every price before you see it."],
  ],
  whyTitle: "Describe it. Snap the label. That's it.",
  whyText: "No account, no form. A matched repair, our price range and a technician visit in a few minutes.",
  footer: "Tell us what's not cooling. We'll match it to our services, share the price range and book a technician.",
};

const SALON = {
  features: [
    ["Consent first", "Your photo is only shared if you agree, and it's optional."],
    ["Patch test built in", "Any colour service is booked at least 48 hours after your allergy patch test."],
    ["Preview the look", "See an illustration of the colour or cut on your own photo before you come in."],
    ["Matched to our menu", "Every price comes from our own menu, confirmed by your stylist."],
  ],
  nav: "Ask about your hair",
  ask: "What would you like for your hair",
  howLead: "From an idea to a booked appointment, in minutes, with your stylist deciding everything that matters.",
  steps: [
    ["Tell us what you'd like", "A cut, a colour, or something that's bugging you. A photo is optional, and you agree to share it first."],
    ["See it matched to our menu", "We match your wish to the services on our menu, with the published price range. No surprises."],
    ["Patch test noted", "Any colour or bleach service gets an allergy patch test flagged, at least 48 hours before."],
    ["Book your appointment", "Pick a real time from our calendar in three taps. No account, no forms."],
  ],
  points: [
    ["Seconds", "First answer", "You're heard straight away, even while every stylist has a client in the chair."],
    ["Honest", "No promises", "We match what you ask for to our menu. Your stylist confirms the result in person."],
    ["Human", "Final say", "Your stylist approves the service and the price before you see it."],
  ],
  whyTitle: "Tell us the hair you want. That's it.",
  whyText: "No account, no form. A matched service, a price range and an appointment in a few minutes.",
  footer: "Tell us what you'd like. We'll match it to our menu, share the price range and book you with a stylist.",
};

const BARBER = {
  features: [
    ["Book the chair in seconds", "Tell us the cut and pick a real time. No account, no forms."],
    ["Preview the look", "See an illustration of the cut on your own photo before you sit down."],
    ["Menu prices only", "Every price comes from our own menu, never a guess."],
    ["We check in", "When it has been a while since your last cut, we send a friendly note, approved by the barber."],
  ],
  nav: "Book a cut",
  ask: "What cut would you like",
  howLead: "From the cut you want to a booked chair, in minutes. The barber has the final say.",
  steps: [
    ["Tell us the cut", "A fade, a classic cut, the beard, or all of it. A photo of the style helps, and you agree to share it first."],
    ["See it matched to our menu", "We match it to the services on our menu, with the published price. Nothing made up."],
    ["Anything to know first", "A scalp cut, irritation or a big change is noted for the barber before you sit down."],
    ["Book the chair", "Pick a real time from our calendar in three taps. No account, no forms."],
  ],
  points: [
    ["Seconds", "First answer", "You're heard straight away, even with a full shop."],
    ["Menu", "Prices shown", "Every price comes from our own menu, never a guess."],
    ["Human", "Final say", "Your barber confirms the cut and the price in the chair."],
  ],
  whyTitle: "Tell us the cut. Book the chair. That's it.",
  whyText: "No account, no form. A matched cut, the price and a chair time in a few minutes.",
  footer: "Tell us the cut you want. We'll match it to our menu, show the price and book your chair.",
};

const COPY = { roofing: ROOFING, medspa: MEDSPA, plumbing: PLUMBING, hvac: HVAC, salon: SALON, barber: BARBER };
export const siteCopy = (trade) => COPY[trade] || ROOFING;
