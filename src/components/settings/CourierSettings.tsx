import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Truck, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useCourierPartners,
  useAddCourierPartner,
  useUpdateCourierPartner,
  useDeleteCourierPartner,
  type CourierPartner,
} from '@/hooks/useCourierPartners';

const EMPTY_FORM = {
  name: '',
  code: '',
  tracking_url: '',
  tracking_prefix: '',
  is_active: true,
  sort_order: 0,
};

const CourierSettings = () => {
  const { data: couriers = [], isLoading } = useCourierPartners(false); // show all (including inactive)
  const addMutation = useAddCourierPartner();
  const updateMutation = useUpdateCourierPartner();
  const deleteMutation = useDeleteCourierPartner();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (c: CourierPartner) => {
    setForm({
      name: c.name,
      code: c.code,
      tracking_url: c.tracking_url || '',
      tracking_prefix: c.tracking_prefix || '',
      is_active: c.is_active,
      sort_order: c.sort_order,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    // Auto-generate code from name if blank: "French Express" → "french-express"
    const rawCode = form.code.trim() || name;
    const code = rawCode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const payload = {
      name,
      code,
      tracking_url: form.tracking_url.trim() || null,
      tracking_prefix: form.tracking_prefix.trim() || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        await addMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      // Duplicate code — append timestamp to make it unique and retry
      if (err?.message?.includes('duplicate key') || err?.message?.includes('unique constraint')) {
        const uniqueCode = `${code}-${Date.now().toString().slice(-4)}`;
        await addMutation.mutateAsync({ ...payload, code: uniqueCode });
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this courier? Existing orders will keep the courier name.')) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleToggleActive = (c: CourierPartner) => {
    updateMutation.mutate({ id: c.id, is_active: !c.is_active });
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Courier Partners
            </CardTitle>
            <CardDescription>
              Add your courier companies here. The tracking assignment page will show only these couriers.
            </CardDescription>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Courier
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Add / Edit Form ── */}
        {showForm && (
          <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <h4 className="font-semibold text-sm">{editingId ? 'Edit Courier' : 'New Courier'}</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Courier Name *</Label>
                <Input
                  required
                  placeholder="e.g. Delhivery"
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    // Auto-fill code from name only if user hasn't manually typed a code
                    const autoCode = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    setForm(p => ({
                      ...p,
                      name,
                      code: p.code === '' || p.code === p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                        ? autoCode
                        : p.code
                    }));
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Code (auto-generated slug)</Label>
                <Input
                  placeholder="e.g. delhivery"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-0.5">Leave blank to auto-generate from name</p>
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Tracking URL Pattern
              </Label>
              <Input
                placeholder="https://example.com/track/{number}"
                value={form.tracking_url}
                onChange={e => setForm(p => ({ ...p, tracking_url: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Use <code className="bg-gray-100 px-1 rounded">{'{number}'}</code> as placeholder for the tracking number
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Tracking Number Prefix (for auto-detect)</Label>
                <Input
                  placeholder="e.g. 2158 or A1"
                  value={form.tracking_prefix}
                  onChange={e => setForm(p => ({ ...p, tracking_prefix: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  If tracking numbers start with this, the courier is auto-selected
                </p>
              </div>
              <div>
                <Label className="text-xs">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                  className="mt-1 w-24"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="sm" disabled={isPending || !form.name.trim()}>
                <Check className="h-4 w-4 mr-1" />
                {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Courier'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </form>
        )}

        {/* ── Couriers List ── */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : couriers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No couriers added yet.</p>
            <p className="text-xs">Click "Add Courier" to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {couriers.map(c => (
              <div
                key={c.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  c.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{c.code}</Badge>
                      {!c.is_active && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 space-x-3">
                      {c.tracking_prefix && <span>Prefix: <code className="bg-gray-100 px-1 rounded">{c.tracking_prefix}</code></span>}
                      {c.tracking_url && (
                        <span className="truncate max-w-xs inline-block align-bottom">
                          URL: {c.tracking_url.replace('{number}', '...')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => handleToggleActive(c)}
                  >
                    {c.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEdit(c)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(c.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CourierSettings;
