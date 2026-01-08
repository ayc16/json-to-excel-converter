import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/_/g, '');
  }

  private createMapping(file1Keys: string[], file2Keys: string[]): Map<string, string> {
    const mapping = new Map<string, string>();
    const normalizedFile2Keys = new Map<string, string>();
    
    file2Keys.forEach(key => {
      normalizedFile2Keys.set(this.normalizeKey(key), key);
    });
    
    file1Keys.forEach(key1 => {
      const normalized = this.normalizeKey(key1);
      const key2 = normalizedFile2Keys.get(normalized);
      if (key2) {
        mapping.set(key1, key2);
      }
    });
    
    return mapping;
  }

  reorderData(data1: any[], data2: any[]): { reordered: any[], mapping: Map<string, string> } {
    if (!data1.length || !data2.length) {
      throw new Error('Both datasets must have at least one record');
    }

    const file1Keys = Object.keys(data1[0]);
    const file2Keys = Object.keys(data2[0]);
    
    const mapping = this.createMapping(file1Keys, file2Keys);
    
    const reordered = data2.map(row => {
      const newRow: any = {};
      file1Keys.forEach(key1 => {
        const key2 = mapping.get(key1);
        newRow[key1] = key2 ? row[key2] : null;
      });
      return newRow;
    });
    
    return { reordered, mapping };
  }

  exportToExcel(data: any[], fileName: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        saveAs(blob, fileName);
        resolve();
      }, 200);
    });
  }

  getColumns(data: any[]): string[] {
    return data.length > 0 ? Object.keys(data[0]) : [];
  }
}