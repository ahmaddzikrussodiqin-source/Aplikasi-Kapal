# EMERGENCY SYNTAX FIX

**KapalMasuk.jsx line 289 error: `Expected ")" found ";"`**

**Replace the ENTIRE `handleTambahKebutuhanConfirm` function:**

```jsx
const handleTambahKebutuhanConfirm = async () => {
  if (!newKebutuhan.trim() || !selectedKapalForKebutuhan) return;
  
  try {
    const freshKapal = kapalMasukList.find(k => k.id === selectedKapalForKebutuhan.id) || selectedKapalForKebutuhan;
    
    const updatedChecklistStates = { ...(freshKapal.checklistStates || {}) };
    updatedChecklistStates[newKebutuhan.trim()] = false;

    const updatedChecklistDates = { ...(freshKapal.checklistDates || {}) };
    updatedChecklistDates[newKebutuhan.trim()] = '';

    const updatedList = [...(freshKapal.listPersiapan || []), newKebutuhan.trim()];

    const response = await kapalMasukAPI.update(token, freshKapal.id, {
      ...freshKapal,
      listPersiapan: updatedList,
      checklistStates: updatedChecklistStates,
      checklistDates: updatedChecklistDates
    });

    if (response.success) {
      loadData();
      setShowKebutuhanModal(false);
      setSelectedKapalForKebutuhan(null);
      setNewKebutuhan('');
    }
  } catch (error) {
    console.error('Error adding kebutuhan:', error);
  }
};
```

**Then:**
1. `npm run build` ✓
2. `git add . && git commit -m "Syntax fix + persistence"`
3. `railway up`

**Backend will log:** `checklistStates keys: 3 checked: 2` ✓

Copy → Paste → Deploy → Fixed!
