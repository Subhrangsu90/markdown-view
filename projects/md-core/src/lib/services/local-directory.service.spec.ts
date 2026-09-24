import { TestBed } from '@angular/core/testing';
import { LocalDirectoryService } from './local-directory.service';

describe('LocalDirectoryService', () => {
  let service: LocalDirectoryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [LocalDirectoryService],
    });
    service = TestBed.inject(LocalDirectoryService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with isConnected false when no folder is saved', () => {
    expect(service.isConnected()).toBe(false);
    expect(service.connectedDirectoryName()).toBeNull();
  });

  it('should restore directory name from localStorage if present', () => {
    localStorage.setItem('md_local_directory_name', 'MyNotes');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [LocalDirectoryService],
    });
    const restoredService = TestBed.inject(LocalDirectoryService);
    expect(restoredService.connectedDirectoryName()).toBe('MyNotes');
    expect(restoredService.isConnected()).toBe(true);
  });

  it('should clear connectedDirectoryName and localStorage on disconnectDirectory', async () => {
    localStorage.setItem('md_local_directory_name', 'Workspace');
    service.connectedDirectoryName.set('Workspace');
    expect(service.isConnected()).toBe(true);

    await service.disconnectDirectory();
    expect(service.connectedDirectoryName()).toBeNull();
    expect(service.isConnected()).toBe(false);
    expect(localStorage.getItem('md_local_directory_name')).toBeNull();
  });
});
