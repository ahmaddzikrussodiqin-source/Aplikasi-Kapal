# Dokumen Website Sync with App Features

## Completed Features ✅
- [x] Basic ship selection and document listing
- [x] Basic add document functionality
- [x] Basic file upload (single file)
- [x] Image viewer
- [x] PDF opening
- [x] Expiry date highlighting

## Pending Features 🔄

### 1. Update Add Document Dialog
- [ ] Add "jenis" field to add document dialog (currently only has nama)
- [ ] Update form validation to require jenis field

### 2. Comprehensive Document Editing
- [ ] Create full edit document dialog (replace current basic expiry edit)
- [ ] Add jenis field editing
- [ ] Add file management interface in edit dialog
- [ ] Implement file deletion from documents
- [ ] Update file upload in edit mode

### 3. Multiple File Upload with Progress
- [ ] Implement multiple file selection
- [ ] Add upload progress bar
- [ ] Show upload status for each file
- [ ] Handle mixed file types (images + PDFs)

### 4. Expiring Ship Indicators
- [ ] Add logic to check if ships have expiring documents
- [ ] Show red background/indicator for ships with expiring documents
- [ ] Update ship list UI to show expiring indicators

### 5. File Storage Structure
- [ ] Update file storage to match app's JSON format: {"images": [...], "pdfs": [...]}
- [ ] Ensure backward compatibility with existing data
- [ ] Update file parsing logic

### 6. UI Improvements
- [ ] Improve file management UI in edit dialog
- [ ] Add file count displays
- [ ] Better visual indicators for expiring documents
- [ ] Improve overall user experience

## Implementation Order
1. Start with Add Document Dialog (jenis field)
2. Implement Comprehensive Edit Dialog
3. Add Multiple File Upload
4. Add Expiring Ship Indicators
5. Update File Storage Structure
6. Final UI Polish
