import { ApiRequest } from '../types';

export interface ParsedCurl {
  method: ApiRequest['method'];
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
}

export function parseCurlCommand(curlCommand: string): ParsedCurl {
  // Initialize default values
  let method: ApiRequest['method'] = 'GET';
  let url = '';
  let headers: Record<string, string> = {};
  let body = '';

  // Clean up the curl command - remove extra whitespace and line breaks
  const cleanCommand = curlCommand
    .replace(/\\\s*\n\s*/g, ' ') // Handle line continuations
    .replace(/\s+/g, ' ')
    .trim();

  // Remove 'curl' from the beginning if present
  const command = cleanCommand.replace(/^curl\s+/i, '');

  // Split the command into tokens, handling quoted strings
  const tokens = parseTokens(command);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Handle method flags
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[i + 1].toUpperCase() as ApiRequest['method'];
        i++; // Skip the next token as it's the method value
      }
    }
    // Handle header flags
    else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerString = tokens[i + 1];
        const colonIndex = headerString.indexOf(':');
        if (colonIndex > 0) {
          const key = headerString.substring(0, colonIndex).trim();
          const value = headerString.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
        i++; // Skip the next token as it's the header value
      }
    }
    // Handle data flags (body)
    else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      if (i + 1 < tokens.length) {
        body = tokens[i + 1];
        // If method wasn't explicitly set and we have data, assume POST
        if (method === 'GET') {
          method = 'POST';
        }
        i++; // Skip the next token as it's the data value
      }
    }
    // Handle form data
    else if (token === '-F' || token === '--form') {
      if (i + 1 < tokens.length) {
        // For form data, we'll just add it as body for now
        // In a more sophisticated implementation, we could parse form fields
        if (body) {
          body += '&' + tokens[i + 1];
        } else {
          body = tokens[i + 1];
        }
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        if (method === 'GET') {
          method = 'POST';
        }
        i++; // Skip the next token
      }
    }
    // Handle user agent
    else if (token === '-A' || token === '--user-agent') {
      if (i + 1 < tokens.length) {
        headers['User-Agent'] = tokens[i + 1];
        i++; // Skip the next token
      }
    }
    // Handle authorization
    else if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const auth = tokens[i + 1];
        const encoded = btoa(auth); // Base64 encode
        headers['Authorization'] = `Basic ${encoded}`;
        i++; // Skip the next token
      }
    }
    // Handle bearer token
    else if (token.startsWith('--header') && token.includes('Authorization')) {
      // This is handled by the header parsing above
    }
    // If it doesn't start with a dash and we don't have a URL yet, it's probably the URL
    else if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  // Parse query parameters from URL
  const queryParams: Record<string, string> = {};
  if (url.includes('?')) {
    const [baseUrl, queryString] = url.split('?', 2);
    url = baseUrl;
    
    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => {
      queryParams[key] = value;
    });
  }

  return {
    method,
    url,
    headers,
    queryParams,
    body
  };
}

function parseTokens(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      continue;
    }

    if (!inQuotes && char === ' ') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

export function curlToApiRequest(curlCommand: string, name?: string): Omit<ApiRequest, 'id'> {
  const parsed = parseCurlCommand(curlCommand);
  
  return {
    name: name || 'Imported from cURL',
    method: parsed.method,
    url: parsed.url,
    headers: parsed.headers,
    queryParams: parsed.queryParams,
    body: parsed.body
  };
}