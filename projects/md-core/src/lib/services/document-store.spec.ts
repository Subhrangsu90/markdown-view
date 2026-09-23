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

  it('should reorder documents and optionally change folder', () => {
    const doc1 = store.create('Doc 1', 'Content 1', 'Folder A');
    const doc2 = store.create('Doc 2', 'Content 2', 'Folder A');
    const doc3 = store.create('Doc 3', 'Content 3', 'Folder B');

    // Reorder doc3 before doc1 and move to Folder A
    store.reorderDocuments(doc3.id, doc1.id, 'before', 'Folder A');

    const updatedDoc3 = store.documents().find((d) => d.id === doc3.id);
    expect(updatedDoc3?.folder).toBe('Folder A');

    const docsInFolderA = store.getDocumentsInFolder('Folder A');
    expect(docsInFolderA[0].id).toBe(doc3.id);
    expect(docsInFolderA[1].id).toBe(doc1.id);
    expect(docsInFolderA[2].id).toBe(doc2.id);
  });

  it('should reorder folders and persist order', () => {
    store.createFolder('Alpha');
    store.createFolder('Beta');
    store.createFolder('Gamma');

    // Move Gamma before Alpha
    store.reorderFolders('Gamma', 'Alpha', 'before');

    const folders = store.folders();
    const alphaIdx = folders.indexOf('Alpha');
    const gammaIdx = folders.indexOf('Gamma');
  });

  it('should batch move multiple documents to a folder or root', () => {
    const doc1 = store.create('Doc 1', 'Content', 'Folder A');
    const doc2 = store.create('Doc 2', 'Content', 'Folder B');
    const doc3 = store.create('Doc 3', 'Content');

    // Batch move doc1 and doc2 to Folder C
    store.moveManyToFolder([doc1.id, doc2.id], 'Folder C');
    expect(store.documents().find((d) => d.id === doc1.id)?.folder).toBe('Folder C');
    expect(store.documents().find((d) => d.id === doc2.id)?.folder).toBe('Folder C');
    expect(store.documents().find((d) => d.id === doc3.id)?.folder).toBeUndefined();

    // Batch move to root
    store.moveManyToFolder([doc1.id, doc2.id], null);
    expect(store.documents().find((d) => d.id === doc1.id)?.folder).toBeUndefined();
    expect(store.documents().find((d) => d.id === doc2.id)?.folder).toBeUndefined();
  });

  it('should batch delete multiple documents', () => {
    const doc1 = store.create('Doc 1', 'Content');
    const doc2 = store.create('Doc 2', 'Content');
    const doc3 = store.create('Doc 3', 'Content');

    store.select(doc1.id);
    expect(store.activeId()).toBe(doc1.id);

    store.deleteMany([doc1.id, doc2.id]);
    expect(store.documents().some((d) => d.id === doc1.id)).toBe(false);
    expect(store.documents().some((d) => d.id === doc2.id)).toBe(false);
    expect(store.documents().some((d) => d.id === doc3.id)).toBe(true);
    // Active id should reset to a valid surviving document
    expect(store.activeId()).toBeTruthy();
    expect(store.activeId()).not.toBe(doc1.id);
    expect(store.activeId()).not.toBe(doc2.id);
  });

  it('should batch toggle favorite status', () => {
    const doc1 = store.create('Doc 1', 'Content');
    const doc2 = store.create('Doc 2', 'Content');

    expect(doc1.isFavorite).toBeFalsy();
    expect(doc2.isFavorite).toBeFalsy();

    store.toggleFavoriteMany([doc1.id, doc2.id], true);
    expect(store.documents().find((d) => d.id === doc1.id)?.isFavorite).toBe(true);
    expect(store.documents().find((d) => d.id === doc2.id)?.isFavorite).toBe(true);

    store.toggleFavoriteMany([doc1.id, doc2.id], false);
    expect(store.documents().find((d) => d.id === doc1.id)?.isFavorite).toBe(false);
    expect(store.documents().find((d) => d.id === doc2.id)?.isFavorite).toBe(false);
  });
});
