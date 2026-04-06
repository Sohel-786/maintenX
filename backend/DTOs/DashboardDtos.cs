namespace net_backend.DTOs
{
    public class DashboardSummaryCountsDto
    {
        public int Total { get; set; }
        public int Open { get; set; }
        public int InProgress { get; set; }
        public int Completed { get; set; }
    }

    public class DashboardKpiDto
    {
        public int TotalTickets { get; set; }
        public int TicketsWithHandler { get; set; }
        public int TicketsClosed { get; set; }
        public int PendingClosure { get; set; }
        public int Reopened { get; set; }
        public int Reassigned { get; set; }
        public double CloseRatePercent { get; set; }
    }

    public class HandlerPerformanceRowDto
    {
        public int HandlerUserId { get; set; }
        public string HandlerName { get; set; } = string.Empty;
        public string? CompanyName { get; set; }
        public int AssignedTotal { get; set; }
        public int Completed { get; set; }
        public int Reopened { get; set; }
        public double CompletionRatePercent { get; set; }
    }

    public class LocationWiseCountDto
    {
        public int LocationId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>scope: location | personalRaised | personalAssigned</summary>
    public class DashboardMetricsDto
    {
        public string Scope { get; set; } = "personalRaised";
        public DashboardSummaryCountsDto Summary { get; set; } = new();
        public DashboardKpiDto Kpi { get; set; } = new();
        public List<HandlerPerformanceRowDto> HandlerPerformance { get; set; } = new();
        public List<LocationWiseCountDto> LocationWiseCount { get; set; } = new();
    }
}
