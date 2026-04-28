const ORDERS_SHEET_NAME = 'Orders';
const ORDER_HEADERS = [
  'id',
  'created_at',
  'customer_name',
  'customer_phone',
  'site_address',
  'landmark',
  'delivery_type',
  'scheduled_time',
  'items',
  'subtotal',
  'convenience_fee',
  'total',
  'payment_method',
  'status',
  'eta',
  'status_token',
  'update_token',
];

const VALID_STATUS_TRANSITIONS = {
  received: ['eta_assigned', 'cancelled'],
  eta_assigned: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const secret = e.headers?.['X-Secret'] || e.headers?.['x-secret'] || payload.secret;
    validateSecret_(secret);

    if (payload.action === 'createOrder') {
      return json_({ success: true, data: createOrder_(payload.data) });
    }

    if (payload.action === 'updateStatus') {
      return json_(updateStatus_(payload.data));
    }

    return json_({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: error.message || 'Apps Script error' });
  }
}

function doGet(e) {
  try {
    const secret = e.headers?.['X-Secret'] || e.headers?.['x-secret'] || e.parameter.secret;
    validateSecret_(secret);

    const action = e.parameter.action;
    if (action === 'getOrder') {
      const order = getOrderByStatusToken_(e.parameter.token);
      return json_({ success: Boolean(order), data: order });
    }

    return json_({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: error.message || 'Apps Script error' });
  }
}

function createOrder_(data) {
  if (!data || !data.id || !data.status_token || !data.update_token) {
    throw new Error('Invalid order payload');
  }

  const sheet = getOrdersSheet_();
  const headers = ensureHeaders_(sheet);
  const row = headers.map((header) => data[header] ?? '');
  sheet.appendRow(row);
  return {
    id: data.id,
    status_token: data.status_token,
    update_token: data.update_token,
  };
}

function getOrderByStatusToken_(token) {
  if (!token) {
    throw new Error('Token is required');
  }

  const sheet = getOrdersSheet_();
  const rows = getRows_(sheet);
  return rows.find((row) => row.status_token === token) || null;
}

function updateStatus_(data) {
  if (!data || !data.update_token || !data.status || !data.pin) {
    return { success: false, error: 'Missing required fields' };
  }

  validateAgentPin_(data.pin);

  const sheet = getOrdersSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return { success: false, error: 'Order not found' };
  }

  const headers = values[0].map(String);
  const updateTokenIndex = headers.indexOf('update_token');
  const statusIndex = headers.indexOf('status');
  const etaIndex = headers.indexOf('eta');

  if (updateTokenIndex === -1 || statusIndex === -1) {
    throw new Error('Orders sheet is missing required headers');
  }

  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][updateTokenIndex]) !== data.update_token) {
      continue;
    }

    const currentStatus = String(values[i][statusIndex]);
    const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(data.status)) {
      return { success: false, error: 'Invalid status transition' };
    }

    sheet.getRange(i + 1, statusIndex + 1).setValue(data.status);
    if (etaIndex !== -1 && data.eta) {
      sheet.getRange(i + 1, etaIndex + 1).setValue(data.eta);
    }

    return { success: true };
  }

  return { success: false, error: 'Order not found' };
}

function getOrdersSheet_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('Spreadsheet is not configured');
  }

  return spreadsheet.getSheetByName(ORDERS_SHEET_NAME) || spreadsheet.insertSheet(ORDERS_SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const currentHeaders = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String)
    : [];

  if (currentHeaders.length === 0 || currentHeaders.every((header) => !header)) {
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    return ORDER_HEADERS;
  }

  const missingHeaders = ORDER_HEADERS.filter((header) => !currentHeaders.includes(header));
  if (missingHeaders.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    return currentHeaders.concat(missingHeaders);
  }

  return currentHeaders;
}

function getRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(String);
  return values.slice(1).map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {});
  });
}

function validateAgentPin_(pin) {
  const configuredPin = PropertiesService.getScriptProperties().getProperty('AGENT_PIN');
  if (!configuredPin) {
    throw new Error('AGENT_PIN is not configured');
  }

  if (String(pin) !== configuredPin) {
    throw new Error('Invalid PIN');
  }
}

function validateSecret_(actualSecret) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_SECRET');
  if (!expectedSecret) {
    return;
  }

  if (actualSecret !== expectedSecret) {
    throw new Error('Unauthorized');
  }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
