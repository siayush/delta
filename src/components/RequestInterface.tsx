import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ApiRequest, ApiResponse, TabType } from '../types';
import './RequestInterface.css';

interface RequestInterfaceProps {
  request: ApiRequest;
  onRequestUpdate: (request: ApiRequest) => void;
  onResponseReceived: (response: ApiResponse | null) => void;
}

const RequestInterface: React.FC<RequestInterfaceProps> = ({
  request,
  onRequestUpdate,
  onResponseReceived
}) => {
  const [activeTab, setActiveTab] = useState<'headers' | 'params' | 'body'>('headers');
  const [isLoading, setIsLoading] = useState(false);
  const [localRequest, setLocalRequest] = useState<ApiRequest>(request);

  useEffect(() => {
    setLocalRequest(request);
  }, [request]);

  const updateLocalRequest = (updates: Partial<ApiRequest>) => {
    const updatedRequest = { ...localRequest, ...updates };
    setLocalRequest(updatedRequest);
    onRequestUpdate(updatedRequest);
  };

  const handleNameChange = (name: string) => {
    updateLocalRequest({ name });
  };

  const handleMethodChange = (method: ApiRequest['method']) => {
    updateLocalRequest({ method });
  };

  const handleUrlChange = (url: string) => {
    updateLocalRequest({ url });
  };

  const handleHeadersChange = (headers: Record<string, string>) => {
    updateLocalRequest({ headers });
  };

  const handleQueryParamsChange = (queryParams: Record<string, string>) => {
    updateLocalRequest({ queryParams });
  };

  const handleBodyChange = (body: string) => {
    updateLocalRequest({ body });
  };

  const buildUrl = () => {
    let url = localRequest.url;
    const params = new URLSearchParams();
    
    Object.entries(localRequest.queryParams).forEach(([key, value]) => {
      if (key.trim() && value.trim()) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  };

  const sendRequest = async () => {
    if (!localRequest.url.trim()) {
      alert('Please enter a URL');
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const config: any = {
        method: localRequest.method,
        url: buildUrl(),
        headers: {},
        timeout: 30000
      };

      // Add headers
      Object.entries(localRequest.headers).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          config.headers[key] = value;
        }
      });

      // Add body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(localRequest.method) && localRequest.body.trim()) {
        try {
          config.data = JSON.parse(localRequest.body);
          config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
        } catch (e) {
          config.data = localRequest.body;
          config.headers['Content-Type'] = config.headers['Content-Type'] || 'text/plain';
        }
      }

      const response = await axios(config);
      const endTime = Date.now();

      const apiResponse: ApiResponse = {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers as Record<string, string>,
        responseTime: endTime - startTime
      };

      onResponseReceived(apiResponse);
    } catch (error: any) {
      const endTime = Date.now();
      
      if (error.response) {
        const apiResponse: ApiResponse = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers as Record<string, string>,
          responseTime: endTime - startTime
        };
        onResponseReceived(apiResponse);
      } else {
        const apiResponse: ApiResponse = {
          status: 0,
          statusText: error.message || 'Network Error',
          data: { error: error.message || 'Request failed' },
          headers: {},
          responseTime: endTime - startTime
        };
        onResponseReceived(apiResponse);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="request-interface">
      <div className="request-header">
        <input
          type="text"
          value={localRequest.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="request-name-input"
          placeholder="Request name"
        />
      </div>

      <div className="request-line">
        <select
          value={localRequest.method}
          onChange={(e) => handleMethodChange(e.target.value as ApiRequest['method'])}
          className="method-select"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <input
          type="text"
          value={localRequest.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="url-input"
          placeholder="Enter request URL"
        />

        <button
          onClick={sendRequest}
          disabled={isLoading || !localRequest.url.trim()}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className="request-tabs">
        <div className="tab-headers">
          <button
            className={`tab-header ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            Headers ({Object.keys(localRequest.headers).length})
          </button>
          <button
            className={`tab-header ${activeTab === 'params' ? 'active' : ''}`}
            onClick={() => setActiveTab('params')}
          >
            Query Params ({Object.keys(localRequest.queryParams).length})
          </button>
          <button
            className={`tab-header ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            Body
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'headers' && (
            <KeyValueEditor
              data={localRequest.headers}
              onChange={handleHeadersChange}
              placeholder={{ key: 'Header name', value: 'Header value' }}
            />
          )}

          {activeTab === 'params' && (
            <KeyValueEditor
              data={localRequest.queryParams}
              onChange={handleQueryParamsChange}
              placeholder={{ key: 'Parameter name', value: 'Parameter value' }}
            />
          )}

          {activeTab === 'body' && (
            <div className="body-editor">
              <textarea
                value={localRequest.body}
                onChange={(e) => handleBodyChange(e.target.value)}
                className="body-textarea"
                placeholder="Request body (JSON, XML, text, etc.)"
                rows={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface KeyValueEditorProps {
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  placeholder: { key: string; value: string };
}

const KeyValueEditor: React.FC<KeyValueEditorProps> = ({ data, onChange, placeholder }) => {
  const [pairs, setPairs] = useState<Array<{ key: string; value: string; id: string }>>([]);

  useEffect(() => {
    const newPairs = Object.entries(data).map(([key, value], index) => ({
      key,
      value,
      id: `${index}-${key}`
    }));
    // Always have one empty row at the end
    newPairs.push({ key: '', value: '', id: `new-${Date.now()}` });
    setPairs(newPairs);
  }, [data]);

  const updatePair = (id: string, key: string, value: string) => {
    const newPairs = pairs.map(pair => 
      pair.id === id ? { ...pair, key, value } : pair
    );

    // Add new empty row if the last row is being edited
    const lastPair = newPairs[newPairs.length - 1];
    if (lastPair.key.trim() || lastPair.value.trim()) {
      newPairs.push({ key: '', value: '', id: `new-${Date.now()}` });
    }

    setPairs(newPairs);

    // Update the data object
    const newData: Record<string, string> = {};
    newPairs.forEach(pair => {
      if (pair.key.trim() && pair.value.trim()) {
        newData[pair.key] = pair.value;
      }
    });
    onChange(newData);
  };

  const removePair = (id: string) => {
    const newPairs = pairs.filter(pair => pair.id !== id);
    if (newPairs.length === 0 || newPairs[newPairs.length - 1].key.trim() || newPairs[newPairs.length - 1].value.trim()) {
      newPairs.push({ key: '', value: '', id: `new-${Date.now()}` });
    }
    setPairs(newPairs);

    const newData: Record<string, string> = {};
    newPairs.forEach(pair => {
      if (pair.key.trim() && pair.value.trim()) {
        newData[pair.key] = pair.value;
      }
    });
    onChange(newData);
  };

  return (
    <div className="key-value-editor">
      {pairs.map((pair, index) => (
        <div key={pair.id} className="key-value-row">
          <input
            type="text"
            value={pair.key}
            onChange={(e) => updatePair(pair.id, e.target.value, pair.value)}
            placeholder={placeholder.key}
            className="key-input"
          />
          <input
            type="text"
            value={pair.value}
            onChange={(e) => updatePair(pair.id, pair.key, e.target.value)}
            placeholder={placeholder.value}
            className="value-input"
          />
          {(pair.key.trim() || pair.value.trim()) && (
            <button
              onClick={() => removePair(pair.id)}
              className="remove-button"
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default RequestInterface;