import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  template: `
    <div echarts [options]="chartOptions()" class="w-full h-full min-h-[50px] absolute inset-0"></div>
  `,
  styles: ``
})
export class ChartsComponent {
  chartType = input<'heatmap' | 'donut' | 'bar'>('donut');
  
  chartOptions = computed<EChartsOption>(() => {
    const type = this.chartType();
    
    // We would ideally dynamically react to the dark theme attribute, but for now we set a responsive base.
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f1f5f9' : '#334155';
    const splitLineColor = isDark ? '#333333' : '#e2e8f0';
    
    if (type === 'heatmap') {
      return {
        tooltip: { trigger: 'axis', backgroundColor: isDark ? '#111' : '#fff', textStyle: { color: textColor, fontSize: 10 } },
        grid: { left: '8%', right: '8%', bottom: '15%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: ['10AM', '2PM', '6PM', '10PM', '2AM', '6AM'], axisLine: { lineStyle: { color: splitLineColor } }, axisLabel: { fontSize: 8, color: textColor, margin: 8 } },
        yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }, axisLabel: { fontSize: 8, color: textColor } },
        series: [
          { name: 'Pamba', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2 }, areaStyle: { opacity: 0.05 }, data: [120, 232, 101, 134, 90, 230], itemStyle: { color: '#f57c00' } },
          { name: 'Sannidhanam', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2 }, areaStyle: { opacity: 0.05 }, data: [220, 182, 391, 234, 190, 330], itemStyle: { color: '#1976d2' } }
        ]
      };
    }
    
    if (type === 'donut') {
      return {
        tooltip: { trigger: 'item', backgroundColor: isDark ? '#111' : '#fff', textStyle: { color: textColor, fontSize: 10 } },
        series: [{
          type: 'pie',
          radius: ['50%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 2, borderColor: isDark ? '#111' : '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          data: [
            { value: 1048, name: 'Male', itemStyle: { color: '#1976d2' } },
            { value: 735, name: 'Female', itemStyle: { color: '#2e7d32' } },
            { value: 580, name: 'Kids', itemStyle: { color: '#f57c00' } },
            { value: 200, name: 'Aged', itemStyle: { color: '#d32f2f' } }
          ]
        }]
      };
    }
    
    // Bar
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: isDark ? '#111' : '#fff', textStyle: { color: textColor, fontSize: 10 } },
      grid: { left: '2%', right: '4%', bottom: '2%', top: '5%', containLabel: true },
      xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
      yAxis: { type: 'category', data: ['Nilakkal', 'Pamba', 'Sannidhanam'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 8, color: textColor } },
      series: [{
        type: 'bar',
        barWidth: '60%',
        data: [45, 120, 135],
        itemStyle: { color: '#1976d2', borderRadius: [0, 4, 4, 0] }
      }]
    };
  });
}
