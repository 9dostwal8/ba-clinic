// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Plus, Edit, Save, X, Trash2, Check, Activity, User } from 'lucide-react';

interface BillingModel {
  id: string;
  model_name: string;
  billing_type: 'per_treatment' | 'per_patient';
  default_price_per_unit: number;
  currency: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export default function BillingModelsModule() {
  const [models, setModels] = useState<BillingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<BillingModel | null>(null);
  const [formData, setFormData] = useState({
    model_name: '',
    billing_type: 'per_treatment' as 'per_treatment' | 'per_patient',
    default_price_per_unit: 500,
    currency: 'IQD',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('billing_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingModel) {
        const { error } = await supabase
          .from('billing_models')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingModel.id);

        if (error) throw error;
        alert('Billing model updated successfully!');
      } else {
        const { error } = await supabase
          .from('billing_models')
          .insert([formData]);

        if (error) throw error;
        alert('Billing model created successfully!');
      }

      resetForm();
      loadModels();
    } catch (error: any) {
      console.error('Error saving model:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: BillingModel) => {
    setEditingModel(model);
    setFormData({
      model_name: model.model_name,
      billing_type: model.billing_type,
      default_price_per_unit: model.default_price_per_unit,
      currency: model.currency,
      description: model.description,
      is_active: model.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing model? Clinics using this model will need to be reassigned.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('billing_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Billing model deleted successfully!');
      loadModels();
    } catch (error: any) {
      console.error('Error deleting model:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('billing_models')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadModels();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      model_name: '',
      billing_type: 'per_treatment',
      default_price_per_unit: 500,
      currency: 'IQD',
      description: '',
      is_active: true
    });
    setEditingModel(null);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Billing Models
          </h2>
          <p className="text-gray-600 mt-1">Configure billing models for clinic usage tracking</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Billing Model
        </button>
      </div>

      {loading && !showModal ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition ${
                model.is_active ? 'border-green-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{model.model_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{model.description}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    model.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {model.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      model.billing_type === 'per_treatment'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {model.billing_type === 'per_treatment' ? (
                      <>
                        <Activity className="w-3 h-3 mr-1" /> Per Treatment
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 mr-1" /> Per Patient
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Price per Unit:</span>
                  <span className="text-xl font-bold text-green-600">
                    {model.default_price_per_unit.toLocaleString()} {model.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(model)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(model.id, model.is_active)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"
                >
                  <Check className="w-4 h-4" />
                  {model.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {models.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Billing Models</h3>
          <p className="text-gray-500 mb-4">Create your first billing model to get started</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingModel ? 'Edit Billing Model' : 'Add Billing Model'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Standard Treatment Model"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Brief description of this billing model"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type *
                  </label>
                  <select
                    value={formData.billing_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billing_type: e.target.value as 'per_treatment' | 'per_patient'
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="per_treatment">Per Treatment</option>
                    <option value="per_patient">Per Patient</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per Unit *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.default_price_per_unit}
                    onChange={(e) =>
                      setFormData({ ...formData, default_price_per_unit: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="IQD"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active (available for clinics)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  {editingModel ? 'Update Model' : 'Create Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
