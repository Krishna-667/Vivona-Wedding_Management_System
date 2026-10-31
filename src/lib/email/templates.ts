import { BRAND } from "@/lib/brand";

interface BaseEmailWrapperOptions {
  preheader: string;
  heading: string;
  contentHtml: string;
}

function baseEmailWrapper({
  preheader,
  heading,
  contentHtml,
}: BaseEmailWrapperOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      background-color: #FBF7F0;
      color: #1F1A17;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 32px auto;
      background-color: #FFFFFF;
      border: 1px solid #E6D7B8;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(107, 29, 42, 0.05);
    }
    .header {
      background-color: #6B1D2A;
      padding: 32px 24px;
      text-align: center;
      border-bottom: 3px solid #C8A24A;
    }
    .header-logo {
      color: #FBF7F0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .header-sub {
      color: #C8A24A;
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .body {
      padding: 36px 32px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #2D2723;
    }
    .heading {
      font-family: 'Georgia', serif;
      color: #6B1D2A;
      font-size: 22px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .info-card {
      background-color: #FBF7F0;
      border-left: 3px solid #C8A24A;
      padding: 16px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .info-label {
      color: #6E6259;
      font-weight: 500;
    }
    .info-value {
      font-weight: 600;
      color: #1F1A17;
    }
    .button {
      display: inline-block;
      background-color: #6B1D2A;
      color: #FBF7F0 !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      padding: 12px 24px;
      border-radius: 8px;
      margin-top: 24px;
      text-align: center;
    }
    .footer {
      background-color: #FAF6EE;
      border-top: 1px solid #EFE4CF;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      color: #8C7E72;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#FBF7F0;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">${BRAND.name}</div>
      <div class="header-sub">Luxury Destination Wedding Management</div>
    </div>
    <div class="body">
      <h1 class="heading">${heading}</h1>
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>${BRAND.legalName}</strong> · Operations & Concierge</p>
      <p style="margin: 0;">This is a confidential communication regarding luxury wedding management.</p>
    </div>
  </div>
</body>
</html>`;
}

export function renderEnquiryConfirmationEmail(params: {
  clientName: string;
  enquiryCode: string;
  weddingType: string;
  guestCount: number;
  city: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your Wedding Blueprint Has Been Received [${params.enquiryCode}] · ${BRAND.name}`;
  const preheader = `We have received your royal wedding inquiry for ${params.city}. Reference: ${params.enquiryCode}`;

  const contentHtml = `
    <p>Dear ${params.clientName},</p>
    <p>Thank you for entrusting <strong>${BRAND.name}</strong> with the orchestration of your celebrations. We have received your wedding requirements and initiated our preliminary palace venue and date review.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Reference Code:</span> <span class="info-value">${params.enquiryCode}</span></div>
      <div class="info-row"><span class="info-label">Destination:</span> <span class="info-value">${params.city}</span></div>
      <div class="info-row"><span class="info-label">Format:</span> <span class="info-value">${params.weddingType === "package" ? "Curated Royal Package" : "Bespoke Custom Architecture"}</span></div>
      <div class="info-row"><span class="info-label">Planned Guests:</span> <span class="info-value">${params.guestCount} Guests</span></div>
    </div>

    <p>Our lead planning concierge will contact you within one business day to schedule your preliminary consultation and present initial concept ideas.</p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${params.portalUrl}" class="button">Access Client Portal</a>
    </div>

    <p style="margin-top: 32px; font-size: 13px; color: #6E6259;">
      With warm regards,<br>
      <strong>Devraj Rathore</strong><br>
      Lead Planner, ${BRAND.name}
    </p>
  `;

  const text = `Dear ${params.clientName},\n\nThank you for entrusting ${BRAND.name} with your wedding. Reference Code: ${params.enquiryCode}. Destination: ${params.city}. Planned Guests: ${params.guestCount}.\n\nAccess your portal at: ${params.portalUrl}`;

  return {
    subject,
    html: baseEmailWrapper({ preheader, heading: "Celebration Blueprint Received", contentHtml }),
    text,
  };
}

export function renderAdminEnquiryAlertEmail(params: {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  enquiryCode: string;
  city: string;
  guestCount: number;
  type: string;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[Action Required] New Enquiry ${params.enquiryCode} · ${params.clientName} (${params.city})`;
  const preheader = `New ${params.type} enquiry from ${params.clientName} for ${params.guestCount} guests in ${params.city}`;

  const contentHtml = `
    <p>A new wedding inquiry has just arrived via the public wizard.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Client Name:</span> <span class="info-value">${params.clientName}</span></div>
      <div class="info-row"><span class="info-label">Contact:</span> <span class="info-value">${params.clientPhone} · ${params.clientEmail}</span></div>
      <div class="info-row"><span class="info-label">Destination:</span> <span class="info-value">${params.city}</span></div>
      <div class="info-row"><span class="info-label">Guest Count:</span> <span class="info-value">${params.guestCount} guests</span></div>
      <div class="info-row"><span class="info-label">Enquiry Type:</span> <span class="info-value">${params.type.toUpperCase()}</span></div>
    </div>

    <p>Please review and initiate contact within the 48-hour SLA to prevent stale status.</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${params.adminUrl}" class="button">Open CRM Command Center</a>
    </div>
  `;

  const text = `New Enquiry ${params.enquiryCode}\nClient: ${params.clientName}\nEmail: ${params.clientEmail}\nPhone: ${params.clientPhone}\nCity: ${params.city}\nGuests: ${params.guestCount}\nView in CRM: ${params.adminUrl}`;

  return {
    subject,
    html: baseEmailWrapper({ preheader, heading: "New High-Value Enquiry", contentHtml }),
    text,
  };
}
