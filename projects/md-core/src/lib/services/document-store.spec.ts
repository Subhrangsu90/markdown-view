import { TestBed } from '@angular/core/testing';
import { DocumentStore } from './document-store';

describe('DocumentStore', () => {
  let store: DocumentStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DocumentStore],
    });
    store = TestBed.inject(DocumentStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should initialize with at least one document', () => {
    expect(store.documents().length).toBeGreaterThanOrEqual(1);
    expect(store.activeId()).toBeTruthy();
  });

  it('should create and select a new document', () => {
    const initialCount = store.documents().length;
    const doc = store.create('Test Document', '# Hello World');
    expect(doc.title).toBe('Test Document');
    expect(store.documents().length).toBe(initialCount + 1);
    expect(store.activeId()).toBe(doc.id);
  });

  it('should update content of the active document', () => {
    const doc = store.create('Doc To Update', 'Initial');
    store.updateContent('Updated Content');
    const updated = store.activeDocument();
    expect(updated?.content).toBe('Updated Content');
  });

  it('should toggle favorite status', () => {
    const doc = store.create('Favorite Doc', 'Content');
    expect(store.activeDocument()?.isFavorite).toBeFalsy();

    store.toggleFavorite(doc.id);
    expect(store.documents().find((d) => d.id === doc.id)?.isFavorite).toBe(true);

    store.toggleFavorite(doc.id);
    expect(store.documents().find((d) => d.id === doc.id)?.isFavorite).toBe(false);
  });

  it('should duplicate a document', () => {
    const original = store.create('Original Doc', 'Original Content');
    const clone = store.duplicate(original.id);
    expect(clone).toBeTruthy();
    expect(clone?.title).toBe('Original Doc (Copy)');
    expect(clone?.content).toBe('Original Content');
    expect(store.activeId()).toBe(clone?.id);
  });

  it('should delete a document', () => {
    const doc = store.create('To Delete', 'Bye');
    const countBefore = store.documents().length;
    store.delete(doc.id);
    expect(store.documents().length).toBe(countBefore - 1);
    expect(store.documents().some((d) => d.id === doc.id)).toBe(false);
  });

  it('should find document by path or title', () => {
    const doc = store.create('14 local development setup', '# Setup Guide');
    doc.path = '14-local-development-setup.md';

    // Direct path match
    expect(store.findByPathOrTitle('14-local-development-setup.md')?.id).toBe(doc.id);
    // Relative path match
    expect(store.findByPathOrTitle('./14-local-development-setup.md')?.id).toBe(doc.id);
    // Without extension match
    expect(store.findByPathOrTitle('14-local-development-setup')?.id).toBe(doc.id);
    // Normalized title match
    expect(store.findByPathOrTitle('14 local development setup.md')?.id).toBe(doc.id);
  });

  it('should create custom folders and compute unique sorted folders', () => {
    expect(store.createFolder('Engineering')).toBe(true);
    expect(store.createFolder('Engineering')).toBe(false); // duplicate should return false
    expect(store.createFolder('Design')).toBe(true);

    const folders = store.folders();
    expect(folders).toContain('Engineering');
    expect(folders).toContain('Design');
  });

  it('should create document directly inside a folder', () => {
    const doc = store.create('Architecture Plan', '# Arch', 'Engineering');
    expect(doc.folder).toBe('Engineering');
    expect(store.getDocumentsInFolder('Engineering').map((d) => d.id)).toContain(doc.id);
    expect(store.folders()).toContain('Engineering');
  });

  it('should move document to another folder or root', () => {
    const doc = store.create('Moving Doc', 'Content', 'OldFolder');
    expect(doc.folder).toBe('OldFolder');

    store.moveToFolder(doc.id, 'NewFolder');
    const updated = store.documents().find((d) => d.id === doc.id);
    expect(updated?.folder).toBe('NewFolder');

    // Move to root
    store.moveToFolder(doc.id, null);
    const atRoot = store.documents().find((d) => d.id === doc.id);
    expect(atRoot?.folder).toBeUndefined();
    expect(store.uncategorizedDocuments().some((d) => d.id === doc.id)).toBe(true);
  });

  it('should rename a folder and update its documents', () => {
    store.createFolder('Docs');
    const doc = store.create('Intro', 'Welcome', 'Docs');

    store.renameFolder('Docs', 'Documentation');
    expect(store.folders()).toContain('Documentation');
    expect(store.folders()).not.toContain('Docs');

    const updatedDoc = store.documents().find((d) => d.id === doc.id);
    expect(updatedDoc?.folder).toBe('Documentation');
  });

  it('should delete a folder and unassign documents to root by default', () => {
    store.createFolder('TempFolder');
    const doc = store.create('Keep Me', 'Text', 'TempFolder');

    store.deleteFolder('TempFolder', false);
    expect(store.folders()).not.toContain('TempFolder');

    const survivingDoc = store.documents().find((d) => d.id === doc.id);
    expect(survivingDoc).toBeTruthy();
    expect(survivingDoc?.folder).toBeUndefined();
  });

  it('should delete a folder and its documents when deleteDocuments is true', () => {
    store.createFolder('TrashFolder');
    const doc = store.create('Delete Me', 'Text', 'TrashFolder');

    store.deleteFolder('TrashFolder', true);
    expect(store.folders()).not.toContain('TrashFolder');
    expect(store.documents().some((d) => d.id === doc.id)).toBe(false);
  });
});
