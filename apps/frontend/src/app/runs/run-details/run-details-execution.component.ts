import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { RunDetailsService } from './run-details.service';
import { Subject, takeUntil } from 'rxjs';
import TimelinesChart, { Line, TimelinesChartInstance } from 'timelines-chart';
import { groupBy, orderBy } from 'lodash';
import { scaleOrdinal } from 'd3-scale';
import { TaskStatus } from '@tskmgr/common';

const valColorScale: (domain: string) => unknown = scaleOrdinal()
  .domain([TaskStatus.Running, TaskStatus.Completed, TaskStatus.Failed, TaskStatus.Aborted])
  .range(['blue', 'green', 'red', 'black']);

@Component({
  template: `
    <div class="m-2">
      <div #chart id="timelines-chart"></div>
    </div>
  `,
  styles: [``],
})
export class RunDetailsExecutionComponent implements OnDestroy, AfterViewInit {
  readonly destroy$ = new Subject<void>();

  @ViewChild('chart') private chart: ElementRef;
  private timelinesChart: TimelinesChartInstance;

  constructor(private readonly runDetailsService: RunDetailsService, private readonly el: ElementRef) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.timelinesChart.width(this.el.nativeElement.offsetWidth);
  }

  ngAfterViewInit() {
    this.timelinesChart = TimelinesChart()(this.chart.nativeElement);
    this.timelinesChart.rightMargin(300);
    this.timelinesChart.width(this.el.nativeElement.offsetWidth);
    this.timelinesChart.zColorScale(valColorScale as never);

    this.runDetailsService.tasks$.pipe(takeUntil(this.destroy$)).subscribe(async (tasks) => {
      const startedTasks = tasks.filter((x) => !!x.startedAt);
      const orderedTasks = orderBy(startedTasks, (x) => x.startedAt);
      const tasksByCommand = groupBy(orderedTasks, (x) => x.command);

      this.timelinesChart.data([
        {
          group: 'tasks',
          data: orderedTasks.map<Line>((x) => {
            return {
              // if we found duplicated commands, just add id of the task
              label: tasksByCommand[x.command].length > 1 ? `${x.command} #${x.id}` : x.command,
              data: [
                {
                  timeRange: [new Date(x.startedAt as Date), new Date(x.endedAt || new Date())],
                  val: x.status,
                },
              ],
            };
          }),
        },
      ]);
      this.timelinesChart.refresh();
    });
  }
}
