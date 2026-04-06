using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/dashboard")]
    [ApiController]
    public class DashboardController : BaseController
    {
        public DashboardController(ApplicationDbContext context) : base(context)
        {
        }

        /// <summary>
        /// Metrics for the current X-Location-Id (and company). Scope: location-wide for admin/coordinator/assign/view-all;
        /// personal assigned for handlers; personal raised for other employees.
        /// </summary>
        [HttpGet("metrics")]
        public async Task<ActionResult<ApiResponse<DashboardMetricsDto>>> GetMetrics()
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();

            var locationId = await GetCurrentLocationIdAsync();
            var companyId = await GetCurrentCompanyIdAsync();
            var me = await _context.Users.FirstOrDefaultAsync(u => u.Id == CurrentUserId);
            if (me == null) return Unauthorized();
            var perm = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == CurrentUserId);

            var locationWide = me.Role == Role.ADMIN
                || me.Role == Role.COORDINATOR
                || perm?.AssignComplaints == true
                || perm?.ViewAllComplaints == true;

            string scope;
            IQueryable<Complaint> q = _context.Complaints.AsNoTracking().Where(c => c.LocationId == locationId);

            if (locationWide)
            {
                scope = "location";
            }
            else if (me.Role == Role.HANDLER)
            {
                scope = "personalAssigned";
                q = q.Where(c => c.AssignedHandlerUserId == me.Id);
            }
            else
            {
                scope = "personalRaised";
                q = q.Where(c => c.RaisedByUserId == me.Id);
            }

            var total = await q.CountAsync();
            var open = await q.CountAsync(c => c.Status == ComplaintStatus.Open);
            var inProgress = await q.CountAsync(c =>
                c.Status == ComplaintStatus.Assigned
                || c.Status == ComplaintStatus.Accepted
                || c.Status == ComplaintStatus.InProgress);
            var completed = await q.CountAsync(c =>
                c.Status == ComplaintStatus.Done || c.Status == ComplaintStatus.Closed);

            var summary = new DashboardSummaryCountsDto
            {
                Total = total,
                Open = open,
                InProgress = inProgress,
                Completed = completed
            };

            var ticketsWithHandler = await q.CountAsync(c => c.AssignedHandlerUserId != null);
            var ticketsClosed = await q.CountAsync(c => c.Status == ComplaintStatus.Closed);
            var pendingClosure = await q.CountAsync(c => c.Status == ComplaintStatus.Done);

            var complaintIdsSub = q.Select(c => c.Id);
            var reopenLower = "reopened";
            var reassignLower = "reassigned";

            var reopened = await _context.ComplaintLogs.AsNoTracking()
                .Where(l => complaintIdsSub.Contains(l.ComplaintId)
                    && l.Message != null
                    && l.Message.ToLower().Contains(reopenLower))
                .Select(l => l.ComplaintId)
                .Distinct()
                .CountAsync();

            var reassigned = await _context.ComplaintLogs.AsNoTracking()
                .Where(l => complaintIdsSub.Contains(l.ComplaintId)
                    && l.Message != null
                    && l.Message.ToLower().Contains(reassignLower))
                .Select(l => l.ComplaintId)
                .Distinct()
                .CountAsync();

            var closeRate = total > 0 ? Math.Round(100.0 * ticketsClosed / total, 1) : 0;

            var kpi = new DashboardKpiDto
            {
                TotalTickets = total,
                TicketsWithHandler = ticketsWithHandler,
                TicketsClosed = ticketsClosed,
                PendingClosure = pendingClosure,
                Reopened = reopened,
                Reassigned = reassigned,
                CloseRatePercent = closeRate
            };

            var handlerPerformance = new List<HandlerPerformanceRowDto>();
            if (scope == "location")
            {
                var loc = await _context.Locations
                    .AsNoTracking()
                    .Include(l => l.Company)
                    .FirstOrDefaultAsync(l => l.Id == locationId);
                var companyName = loc?.Company?.Name;

                var handlerIds = await _context.UserLocationAccess.AsNoTracking()
                    .Where(ula => ula.LocationId == locationId)
                    .Join(_context.Users.Where(u => u.Role == Role.HANDLER && u.IsActive),
                        ula => ula.UserId, u => u.Id, (_, u) => u.Id)
                    .Distinct()
                    .ToListAsync();

                var baseLoc = _context.Complaints.AsNoTracking().Where(c => c.LocationId == locationId);

                foreach (var hid in handlerIds)
                {
                    var qh = baseLoc.Where(c => c.AssignedHandlerUserId == hid);
                    var assignedTotal = await qh.CountAsync();
                    var done = await qh.CountAsync(c =>
                        c.Status == ComplaintStatus.Done || c.Status == ComplaintStatus.Closed);

                    var reopenedH = await _context.ComplaintLogs.AsNoTracking()
                        .Where(l => l.Message != null && l.Message.ToLower().Contains(reopenLower))
                        .Where(l => _context.Complaints.Any(c =>
                            c.Id == l.ComplaintId && c.LocationId == locationId && c.AssignedHandlerUserId == hid))
                        .Select(l => l.ComplaintId)
                        .Distinct()
                        .CountAsync();

                    var handlerUser = await _context.Users.AsNoTracking().FirstAsync(u => u.Id == hid);
                    var name = $"{handlerUser.FirstName} {handlerUser.LastName}".Trim();
                    var rate = assignedTotal > 0 ? Math.Round(100.0 * done / assignedTotal, 1) : 0;

                    handlerPerformance.Add(new HandlerPerformanceRowDto
                    {
                        HandlerUserId = hid,
                        HandlerName = name,
                        CompanyName = companyName,
                        AssignedTotal = assignedTotal,
                        Completed = done,
                        Reopened = reopenedH,
                        CompletionRatePercent = rate
                    });
                }

                handlerPerformance = handlerPerformance
                    .OrderByDescending(h => h.AssignedTotal)
                    .ThenBy(h => h.HandlerName)
                    .ToList();
            }

            var allowed = await GetAllowedLocationIdsAsync();
            var companyLocationIds = allowed.Where(x => x.companyId == companyId).Select(x => x.locationId).ToHashSet();
            var locationWise = await _context.Locations.AsNoTracking()
                .Where(l => l.CompanyId == companyId && companyLocationIds.Contains(l.Id) && l.IsActive)
                .OrderBy(l => l.Name)
                .Select(l => new { l.Id, l.Name })
                .ToListAsync();

            var locationWiseCount = new List<LocationWiseCountDto>();
            foreach (var loc in locationWise)
            {
                IQueryable<Complaint> qw = _context.Complaints.AsNoTracking().Where(c => c.LocationId == loc.Id);
                if (!locationWide)
                {
                    if (me.Role == Role.HANDLER)
                        qw = qw.Where(c => c.AssignedHandlerUserId == me.Id);
                    else
                        qw = qw.Where(c => c.RaisedByUserId == me.Id);
                }

                var cnt = await qw.CountAsync();
                locationWiseCount.Add(new LocationWiseCountDto
                {
                    LocationId = loc.Id,
                    LocationName = loc.Name,
                    Count = cnt
                });
            }

            var dto = new DashboardMetricsDto
            {
                Scope = scope,
                Summary = summary,
                Kpi = kpi,
                HandlerPerformance = handlerPerformance,
                LocationWiseCount = locationWiseCount
            };

            return Ok(new ApiResponse<DashboardMetricsDto> { Data = dto });
        }
    }
}
