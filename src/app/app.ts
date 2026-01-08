
import { ExcelService } from './excel';
import { forkJoin } from 'rxjs';
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface FileStats {
  records: number;
  columns: number;
}

type StatusType = 'success' | 'error' | 'processing' | '';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class App implements OnInit {
  //private http = signal(this.httpClient);
  //private excelService = signal(this.excelServiceInjected);

  data1 = signal<any[]>([]);
  data2 = signal<any[]>([]);
  
  file1Stats = computed(() => ({
    records: this.data1().length,
    columns: this.data1().length > 0 ? Object.keys(this.data1()[0]).length : 0
  }));
  
  file2Stats = computed(() => ({
    records: this.data2().length,
    columns: this.data2().length > 0 ? Object.keys(this.data2()[0]).length : 0
  }));
  
  columns = computed(() => this.excelServiceInjected.getColumns(this.data1()));
  
  status = signal('');
  statusType = signal<StatusType>('');
  loading = signal(false);

  constructor(
    private httpClient: HttpClient,
    private excelServiceInjected: ExcelService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.updateStatus('Loading data...', 'processing');

    forkJoin({
      newFile: this.httpClient.get<any[]>('New.json'),
      oldFile: this.httpClient.get<any[]>('Old.json')
    }).subscribe({
      next: (result) => {
        this.data1.set(result.newFile || []);
        this.data2.set(result.oldFile || []);
        
        this.updateStatus(
          `Loaded ${this.file1Stats().records} records from New.json and ${this.file2Stats().records} records from Old.json`,
          'success'
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.updateStatus('Error loading data: ' + error.message, 'error');
        this.loading.set(false);
      }
    });
  }

  async convertToExcel() {
    if (!this.data1().length || !this.data2().length) {
      this.updateStatus('No data available to convert', 'error');
      return;
    }

    this.loading.set(true);
    this.updateStatus('Processing data...', 'processing');

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.updateStatus('Reordering File 2 columns...', 'processing');
      const { reordered } = this.excelServiceInjected.reorderData(this.data1(), this.data2());

      this.updateStatus('Downloading New File...', 'processing');
      await this.excelServiceInjected.exportToExcel(this.data1(), 'NewFile.xlsx');

      await new Promise(resolve => setTimeout(resolve, 2000));

      this.updateStatus('Downloading Old File...', 'processing');
      await this.excelServiceInjected.exportToExcel(reordered, 'OldFile.xlsx');

      await new Promise(resolve => setTimeout(resolve, 1000));

      this.updateStatus(
        `Success! Downloaded ${this.file1Stats().records} records from New File and ${this.file2Stats().records} records from Old File with matching ${this.file1Stats().columns} columns`,
        'success'
      );
      this.loading.set(false);

    } catch (error: any) {
      this.updateStatus('Error: ' + error.message, 'error');
      this.loading.set(false);
    }
  }

  private updateStatus(message: string, type: StatusType) {
    this.status.set(message);
    this.statusType.set(type);
  }
}