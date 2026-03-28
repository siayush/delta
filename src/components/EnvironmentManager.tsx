import React, { useState } from 'react';
import { Environment } from '../types';
import './EnvironmentManager.css';

interface EnvironmentManagerProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onSelectEnvironment: (id: string | null) => void;
  onCreateEnvironment: (env: Omit<Environment, 'id'>) => void;
  onUpdateEnvironment: (id: string, env: Partial<Environment>) => void;
  onDeleteEnvironment: (id: string) => void;
}

const COLORS = ['#28a745', '#ffc107', '#dc3545', '#007bff', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'];

const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  environments,
  activeEnvironmentId,
  onSelectEnvironment,
  onCreateEnvironment,
  onUpdateEnvironment,
  onDeleteEnvironment,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [form, setForm] = useState({ name: '', baseUrl: '', color: COLORS[0], variables: '' });

  const activeEnv = environments.find(e => e.id === activeEnvironmentId);

  const openCreate = () => {
    setEditingEnv(null);
    setForm({ name: '', baseUrl: '', color: COLORS[environments.length % COLORS.length], variables: '' });
    setShowModal(true);
  };

  const openEdit = (env: Environment) => {
    setEditingEnv(env);
    const vars = Object.entries(env.variables).map(([k, v]) => `${k}=${v}`).join('\n');
    setForm({ name: env.name, baseUrl: env.baseUrl, color: env.color, variables: vars });
    setShowModal(true);
  };

  const parseVariables = (text: string): Record<string, string> => {
    const vars: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim();
        if (key) vars[key] = val;
      }
    });
    return vars;
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.baseUrl.trim()) return;
    const envData = {
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      color: form.color,
      variables: parseVariables(form.variables),
    };
    if (editingEnv) {
      onUpdateEnvironment(editingEnv.id, envData);
    } else {
      onCreateEnvironment(envData);
    }
    setShowModal(false);
  };

  return (
    <div className="env-manager">
      <div className="env-selector">
        <select
          value={activeEnvironmentId || ''}
          onChange={(e) => onSelectEnvironment(e.target.value || null)}
          className="env-select"
        >
          <option value="">No Environment</option>
          {environments.map(env => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        {activeEnv && (
          <span className="env-dot" style={{ backgroundColor: activeEnv.color }} />
        )}
        <button onClick={openCreate} className="btn btn-sm btn-secondary env-manage-btn" title="Manage Environments">
          +
        </button>
      </div>

      {showModal && (
        <div className="env-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="env-modal" onClick={e => e.stopPropagation()}>
            <div className="env-modal-header">
              <h3>{editingEnv ? 'Edit Environment' : 'New Environment'}</h3>
              <button onClick={() => setShowModal(false)} className="env-close-btn">x</button>
            </div>
            <div className="env-modal-body">
              <div className="env-field">
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Production"
                />
              </div>
              <div className="env-field">
                <label>Base URL</label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="e.g. https://api.example.com"
                />
              </div>
              <div className="env-field">
                <label>Color</label>
                <div className="env-color-picker">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`env-color-swatch ${form.color === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="env-field">
                <label>Variables (one per line, KEY=VALUE)</label>
                <textarea
                  value={form.variables}
                  onChange={e => setForm({ ...form, variables: e.target.value })}
                  placeholder="API_KEY=abc123&#10;VERSION=v2"
                  rows={4}
                />
              </div>
            </div>
            <div className="env-modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-sm btn-primary">
                {editingEnv ? 'Update' : 'Create'}
              </button>
            </div>

            {environments.length > 0 && (
              <div className="env-list">
                <h4>All Environments</h4>
                {environments.map(env => (
                  <div key={env.id} className="env-list-item">
                    <span className="env-dot" style={{ backgroundColor: env.color }} />
                    <span className="env-list-name">{env.name}</span>
                    <span className="env-list-url">{env.baseUrl}</span>
                    <button onClick={() => openEdit(env)} className="btn btn-xs btn-secondary">Edit</button>
                    <button onClick={() => onDeleteEnvironment(env.id)} className="btn btn-xs btn-danger">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentManager;
