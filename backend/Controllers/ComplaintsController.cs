using System.Text.Json;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using net_backend.Utils;
using static net_backend.Services.PaginationHelper;

namespace net_backend.Controllers
{
    [Route("api/complaints")]
    [ApiController]
    public class ComplaintsController : BaseController
    {
        private readonly IWebHostEnvironment _env;

        public ComplaintsController(ApplicationDbContext context, IWebHostEnvironment env) : base(context)
        {
            _env = env;
        }

        private static List<string>? ParseUrls(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json);
            }
            catch
            {
                return null;
            }
        }

        private static string? SerializeUrls(List<string>? urls)
        {
            if (urls == null || urls.Count == 0) return null;
            return JsonSerializer.Serialize(urls);
        }

        private async Task<string> NextComplaintNoAsync(int locationId)
        {
            // New format: TKT-01, TKT-02, ... (per-location sequence)
            const string prefix = "TKT-";
            var last = await _context.Complaints
                .Where(c => c.LocationId == locationId && c.ComplaintNo.StartsWith(prefix))
                .OrderByDescending(c => c.Id)
                .Select(c => c.ComplaintNo)
                .FirstOrDefaultAsync();

            var seq = 1;
            if (!string.IsNullOrWhiteSpace(last) && last.Length > prefix.Length)
            {
                var tail = last[prefix.Length..];
                if (int.TryParse(tail, out var n) && n > 0)
                    seq = n + 1;
            }
            return $"{prefix}{seq:D2}";
        }

        private static bool CanSeeComplaint(Complaint c, User me, UserPermission? perm)
        {
            if (me.Role == Role.ADMIN) return true;
            if (perm?.ViewAllComplaints == true || me.Role == Role.COORDINATOR)
                return true;
            if (me.Role == Role.HANDLER)
                return c.AssignedHandlerUserId == me.Id;
            return c.RaisedByUserId == me.Id;
        }

        private static bool IsValidTransition(ComplaintStatus from, ComplaintStatus to)
        {
            return (from, to) switch
            {
                (ComplaintStatus.Open, ComplaintStatus.Assigned) => true,
                (ComplaintStatus.Assigned, ComplaintStatus.Accepted) => true,
                (ComplaintStatus.Accepted, ComplaintStatus.InProgress) => true,
                (ComplaintStatus.InProgress, ComplaintStatus.Done) => true,
                (ComplaintStatus.Done, ComplaintStatus.Closed) => true,
                _ => false
            };
        }

        private static ComplaintListItemDto MapListRow(Complaint c)
        {
            return new ComplaintListItemDto
            {
                Id = c.Id,
                ComplaintNo = c.ComplaintNo,
                DescriptionPreview = string.IsNullOrEmpty(c.Description)
                    ? null
                    : (c.Description.Length > 120 ? c.Description[..120] + "…" : c.Description),
                LocationId = c.LocationId,
                LocationName = c.Location?.Name,
                CompanyName = c.Location?.Company?.Name,
                CategoryId = c.CategoryId,
                CategoryName = c.Category?.Name,
                DepartmentId = c.DepartmentId,
                DepartmentName = c.Department?.Name,
                Status = c.Status,
                AssignedHandlerUserId = c.AssignedHandlerUserId,
                AssignedHandlerName = c.AssignedHandler != null
                    ? $"{c.AssignedHandler.FirstName} {c.AssignedHandler.LastName}".Trim()
                    : null,
                RaisedByUserId = c.RaisedByUserId,
                RaisedByName = c.RaisedBy != null
                    ? $"{c.RaisedBy.FirstName} {c.RaisedBy.LastName}".Trim()
                    : null,
                ImageUrls = ParseUrls(c.ImageUrlsJson),
                CompletionPhotoUrl = c.CompletionPhotoUrl,
                CompletionImageUrls = ParseUrls(c.CompletionImageUrlsJson),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            };
        }

        [HttpPost("attachments")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment(IFormFile file)
        {
            if (!await HasPermission("RaiseComplaint") && !await HasPermission("HandleComplaints"))
                return Forbidden();
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file." });
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif")
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only image files are allowed." });

            var webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "complaints");
            Directory.CreateDirectory(dir);
            var name = $"{Guid.NewGuid():N}{ext}";
            var physical = Path.Combine(dir, name);
            await using (var stream = System.IO.File.Create(physical))
                await file.CopyToAsync(stream);

            var url = $"/storage/complaints/{name}";
            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        private static string SafeSeg(string s)
        {
            var clean = new string(s.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
            return string.IsNullOrWhiteSpace(clean) ? "x" : clean;
        }

        private string BuildTicketAssetsPhysicalDir(int companyId, int locationId, int departmentId, string complaintNo, int complaintId)
        {
            var ticketSeg = SafeSeg($"{complaintNo}-{complaintId}");
            return Path.Combine(
                _env.ContentRootPath,
                "wwwroot",
                "storage",
                "company",
                companyId.ToString(),
                "location",
                locationId.ToString(),
                "department",
                departmentId.ToString(),
                "ticket",
                ticketSeg,
                "assets");
        }

        private static string BuildTicketAssetsUrl(int companyId, int locationId, int departmentId, string complaintNo, int complaintId, string fileName)
        {
            var ticketSeg = SafeSeg($"{complaintNo}-{complaintId}");
            return $"/storage/company/{companyId}/location/{locationId}/department/{departmentId}/ticket/{ticketSeg}/assets/{fileName}";
        }

        [HttpPost("{id:int}/raised-photo")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
        public async Task<ActionResult<ApiResponse<object>>> UploadRaisedPhoto(int id, IFormFile file)
        {
            if (!await HasPermission("RaiseComplaint")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync();

            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file." });
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!ImageOptimizer.IsImageExtension(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only image files are allowed." });

            var c = await _context.Complaints.FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);
            if (c == null) return NotFound();

            // Ensure ticket's department exists (required now)
            var departmentId = c.DepartmentId;

            var dir = BuildTicketAssetsPhysicalDir(companyId, locationId, departmentId, c.ComplaintNo, c.Id);
            var fileName = $"{Guid.NewGuid():N}.webp";
            var physical = Path.Combine(dir, fileName);

            await using (var stream = file.OpenReadStream())
            {
                await ImageOptimizer.OptimizeImageToWebpAsync(stream, physical);
            }

            var url = BuildTicketAssetsUrl(companyId, locationId, departmentId, c.ComplaintNo, c.Id, fileName);

            var urls = ParseUrls(c.ImageUrlsJson) ?? new List<string>();
            urls.Add(url);
            c.ImageUrlsJson = SerializeUrls(urls);
            c.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        [HttpPost("{id:int}/completion-photo")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
        public async Task<ActionResult<ApiResponse<object>>> UploadCompletionPhoto(int id, IFormFile file)
        {
            if (!await HasPermission("HandleComplaints")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync();

            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file." });
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!ImageOptimizer.IsImageExtension(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only image files are allowed." });

            var c = await _context.Complaints.FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);
            if (c == null) return NotFound();

            var departmentId = c.DepartmentId;
            var dir = BuildTicketAssetsPhysicalDir(companyId, locationId, departmentId, c.ComplaintNo, c.Id);
            var fileName = $"completion-{Guid.NewGuid():N}.webp";
            var physical = Path.Combine(dir, fileName);

            await using (var stream = file.OpenReadStream())
            {
                await ImageOptimizer.OptimizeImageToWebpAsync(stream, physical);
            }

            var url = BuildTicketAssetsUrl(companyId, locationId, departmentId, c.ComplaintNo, c.Id, fileName);
            // Backward compatibility: keep the first completion photo in CompletionPhotoUrl
            if (string.IsNullOrWhiteSpace(c.CompletionPhotoUrl))
                c.CompletionPhotoUrl = url;

            // New: allow multiple completion attachments (append)
            var completionUrls = ParseUrls(c.CompletionImageUrlsJson) ?? new List<string>();
            completionUrls.Add(url);
            c.CompletionImageUrlsJson = SerializeUrls(completionUrls);
            c.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<ComplaintListItemDto>>>> GetList(
            [FromQuery] string? search,
            [FromQuery] ComplaintStatus? status,
            [FromQuery] string? statusGroup,
            [FromQuery] string? assignmentBucket,
            [FromQuery] int? categoryId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasPermission("ViewComplaints")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var me = await _context.Users.FirstOrDefaultAsync(u => u.Id == CurrentUserId);
            if (me == null) return Unauthorized();
            var perm = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == CurrentUserId);

            var q = _context.Complaints
                .AsNoTracking()
                .Include(c => c.Location)!.ThenInclude(l => l!.Company)
                .Include(c => c.Category)
                .Include(c => c.Department)
                .Include(c => c.RaisedBy)
                .Include(c => c.AssignedHandler)
                .Where(c => c.LocationId == locationId);

            var bucketNorm = assignmentBucket?.Trim().ToLowerInvariant();
            var isAssignmentDesk = bucketNorm is "unassigned" or "activereassign";

            if (isAssignmentDesk)
            {
                if (!await HasPermission("AssignComplaints"))
                    return Forbidden();
                if (bucketNorm == "unassigned")
                    q = q.Where(c => c.Status == ComplaintStatus.Open && c.AssignedHandlerUserId == null);
                else
                    q = q.Where(c =>
                        c.Status == ComplaintStatus.Assigned ||
                        c.Status == ComplaintStatus.Accepted ||
                        c.Status == ComplaintStatus.InProgress);
            }
            else
            {
                if (me.Role == Role.EMPLOYEE && perm?.ViewAllComplaints != true)
                    q = q.Where(c => c.RaisedByUserId == me.Id);
                else if (me.Role == Role.HANDLER)
                    q = q.Where(c => c.AssignedHandlerUserId == me.Id);
            }

            var sg = statusGroup?.Trim().ToLowerInvariant();
            if (sg is "open" or "inprogress" or "completed")
            {
                if (sg == "open")
                    q = q.Where(c => c.Status == ComplaintStatus.Open);
                else if (sg == "inprogress")
                    q = q.Where(c =>
                        c.Status == ComplaintStatus.Assigned
                        || c.Status == ComplaintStatus.Accepted
                        || c.Status == ComplaintStatus.InProgress);
                else
                    q = q.Where(c =>
                        c.Status == ComplaintStatus.Done || c.Status == ComplaintStatus.Closed);
            }
            if (status.HasValue)
                q = q.Where(c => c.Status == status.Value);
            if (categoryId.HasValue && categoryId.Value > 0)
                q = q.Where(c => c.CategoryId == categoryId.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(c =>
                    c.ComplaintNo.ToLower().Contains(s) ||
                    (c.Description != null && c.Description.ToLower().Contains(s)));
            }

            q = q.OrderByDescending(c => c.CreatedAt);
            var total = await q.CountAsync();
            var (skip, take) = PaginationHelper.GetSkipTake(page, pageSize);
            var rows = await q.Skip(skip).Take(take).ToListAsync();
            var data = rows.Select(MapListRow).ToList();

            return Ok(new ApiResponse<List<ComplaintListItemDto>> { Data = data, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ComplaintDetailDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewComplaints")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var c = await _context.Complaints
                .Include(x => x.Location)!.ThenInclude(l => l!.Company)
                .Include(x => x.Category)
                .Include(x => x.Department)
                .Include(x => x.RaisedBy)
                .Include(x => x.AssignedHandler)
                .FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);
            if (c == null) return NotFound(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Not found" });

            var me = await _context.Users.FirstAsync(u => u.Id == CurrentUserId);
            var perm = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == CurrentUserId);
            if (!CanSeeComplaint(c, me, perm))
                return Forbidden();

            var logs = await _context.ComplaintLogs
                .Include(l => l.User)
                .Where(l => l.ComplaintId == id)
                .OrderBy(l => l.CreatedAt)
                .ToListAsync();

            var row = MapListRow(c);
            var dto = new ComplaintDetailDto
            {
                Id = row.Id,
                ComplaintNo = row.ComplaintNo,
                Description = c.Description,
                LocationId = row.LocationId,
                LocationName = row.LocationName,
                CompanyName = row.CompanyName,
                CategoryId = row.CategoryId,
                CategoryName = row.CategoryName,
                DepartmentId = row.DepartmentId,
                DepartmentName = row.DepartmentName,
                Status = row.Status,
                AssignedHandlerUserId = row.AssignedHandlerUserId,
                AssignedHandlerName = row.AssignedHandlerName,
                RaisedByUserId = row.RaisedByUserId,
                RaisedByName = row.RaisedByName,
                ImageUrls = row.ImageUrls,
                CompletionPhotoUrl = row.CompletionPhotoUrl,
                CompletionImageUrls = row.CompletionImageUrls,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt,
                Timeline = logs.Select(l => new ComplaintLogDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    UserName = l.User != null ? $"{l.User.FirstName} {l.User.LastName}".Trim() : null,
                    Message = l.Message,
                    FromStatus = l.FromStatus,
                    ToStatus = l.ToStatus,
                    CreatedAt = l.CreatedAt,
                    AttachmentUrls = ParseUrls(l.AttachmentUrlsJson)
                }).ToList()
            };

            return Ok(new ApiResponse<ComplaintDetailDto> { Data = dto });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ComplaintDetailDto>>> Create([FromBody] CreateComplaintRequest request)
        {
            if (!await HasPermission("RaiseComplaint")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var companyId = await GetCurrentCompanyIdAsync();
            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Description is required." });
            if (request.CategoryId <= 0)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Category is required." });
            if (request.DepartmentId <= 0)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Department is required." });

            var cat = await _context.ComplaintCategories
                .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.CompanyId == companyId && c.IsActive);
            if (cat == null)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Invalid category." });

            var deptOk = await _context.FacilityDepartments.AnyAsync(d =>
                d.Id == request.DepartmentId && d.CompanyId == companyId && d.IsActive);
            if (!deptOk)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Invalid department." });

            // Keep tickets simple: title defaults to category name (no title field in UI).
            var title = cat.Name;
            if (title.Length > 200) title = title[..200];

            var no = await NextComplaintNoAsync(locationId);
            var c = new Complaint
            {
                ComplaintNo = no,
                Title = title,
                Description = request.Description.Trim(),
                LocationId = locationId,
                CategoryId = request.CategoryId,
                DepartmentId = request.DepartmentId,
                Priority = ComplaintPriority.Medium,
                Status = ComplaintStatus.Open,
                RaisedByUserId = CurrentUserId,
                ImageUrlsJson = SerializeUrls(request.ImageUrls),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.Complaints.Add(c);
            await _context.SaveChangesAsync();

            _context.ComplaintLogs.Add(new ComplaintLog
            {
                ComplaintId = c.Id,
                UserId = CurrentUserId,
                Message = "Ticket raised",
                FromStatus = null,
                ToStatus = ComplaintStatus.Open,
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();

            return await GetById(c.Id);
        }

        [HttpPost("{id:int}/assign")]
        public async Task<ActionResult<ApiResponse<ComplaintDetailDto>>> Assign(int id, [FromBody] AssignComplaintRequest request)
        {
            if (!await HasPermission("AssignComplaints")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var c = await _context.Complaints.FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);
            if (c == null) return NotFound();

            if (c.Status != ComplaintStatus.Open && c.Status != ComplaintStatus.Assigned &&
                c.Status != ComplaintStatus.Accepted && c.Status != ComplaintStatus.InProgress)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Cannot assign or reassign this ticket in its current status." });

            var handlerOk = await _context.UserLocationAccess
                .AnyAsync(ula => ula.UserId == request.HandlerUserId && ula.LocationId == locationId);
            var handler = await _context.Users.FindAsync(request.HandlerUserId);
            if (handler == null || !handlerOk || handler.Role != Role.HANDLER)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Invalid handler for this location." });

            if (c.AssignedHandlerUserId == request.HandlerUserId)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = $"Ticket is already assigned to {handler.FirstName} {handler.LastName}." });

            var from = c.Status;
            var prevHandlerId = c.AssignedHandlerUserId;
            
            // If the ticket was in Done status, moving away from it means we start a fresh completion phase.
            // Historical record for the previous 'Done' status is already safe in the timeline snapshots.
            if (from == ComplaintStatus.Done)
            {
                c.CompletionPhotoUrl = null;
                c.CompletionImageUrlsJson = null;
            }

            c.AssignedHandlerUserId = request.HandlerUserId;
            c.Status = ComplaintStatus.Assigned;
            c.UpdatedAt = DateTime.Now;

            var msg = prevHandlerId == request.HandlerUserId
                ? $"Assignment updated — {handler.FirstName} {handler.LastName}".Trim()
                : prevHandlerId == null
                    ? $"Assigned to {handler.FirstName} {handler.LastName}".Trim()
                    : $"Reassigned to {handler.FirstName} {handler.LastName}".Trim();

            _context.ComplaintLogs.Add(new ComplaintLog
            {
                ComplaintId = c.Id,
                UserId = CurrentUserId,
                Message = msg,
                FromStatus = from,
                ToStatus = ComplaintStatus.Assigned,
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();

            return await GetById(id);
        }

        [HttpPost("{id:int}/reopen")]
        public async Task<ActionResult<ApiResponse<ComplaintDetailDto>>> Reopen(int id)
        {
            if (!await HasPermission("AssignComplaints")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var c = await _context.Complaints.FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);
            if (c == null) return NotFound();
            if (c.Status != ComplaintStatus.Done && c.Status != ComplaintStatus.Closed)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Only Done or Closed tickets can be reopened." });
            if (c.AssignedHandlerUserId == null)
                return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Ticket has no handler to send back to." });

            var from = c.Status;
            c.Status = ComplaintStatus.Assigned;
            c.UpdatedAt = DateTime.Now;

            // Clear current completion data so the next 'Mark Done' phase starts fresh.
            // Historical record is preserved in the timeline log thanks to snapshotting.
            c.CompletionPhotoUrl = null;
            c.CompletionImageUrlsJson = null;

            var handler = await _context.Users.FindAsync(c.AssignedHandlerUserId);
            var hn = handler != null ? $"{handler.FirstName} {handler.LastName}".Trim() : "handler";

            _context.ComplaintLogs.Add(new ComplaintLog
            {
                ComplaintId = c.Id,
                UserId = CurrentUserId,
                Message = $"Ticket reopened — sent back to {hn}",
                FromStatus = from,
                ToStatus = ComplaintStatus.Assigned,
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        [HttpPatch("{id:int}/status")]
        public async Task<ActionResult<ApiResponse<ComplaintDetailDto>>> UpdateStatus(int id, [FromBody] UpdateComplaintStatusRequest request)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var c = await _context.Complaints.FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);
            if (c == null) return NotFound();

            var me = await _context.Users.FirstAsync(u => u.Id == CurrentUserId);
            var perm = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == CurrentUserId);
            var from = c.Status;
            var to = request.Status;

            if (from == to)
                return await GetById(id);

            if (me.Role == Role.ADMIN || perm?.AssignComplaints == true || me.Role == Role.COORDINATOR)
            {
                var allowedTransition = IsValidTransition(from, to)
                    || (from == ComplaintStatus.Done && to == ComplaintStatus.Closed);
                if (!allowedTransition)
                    return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Invalid status transition." });

                // Cleanup active completion data when moving away from 'Done'
                if (from == ComplaintStatus.Done && to != ComplaintStatus.Done)
                {
                    c.CompletionPhotoUrl = null;
                    c.CompletionImageUrlsJson = null;
                }

                c.Status = to;
                c.UpdatedAt = DateTime.Now;

                var log = new ComplaintLog
                {
                    ComplaintId = c.Id,
                    UserId = CurrentUserId,
                    Message = string.IsNullOrWhiteSpace(request.Message) ? $"Status → {to}" : request.Message!.Trim(),
                    FromStatus = from,
                    ToStatus = to,
                    CreatedAt = DateTime.Now
                };
                if (to == ComplaintStatus.Done)
                {
                    // Snapshot the current completion images onto the log for permanent history.
                    log.AttachmentUrlsJson = c.CompletionImageUrlsJson;
                }

                _context.ComplaintLogs.Add(log);
                await _context.SaveChangesAsync();
                return await GetById(id);
            }

            if (await HasPermission("HandleComplaints") && c.AssignedHandlerUserId == CurrentUserId)
            {
                if (!IsValidTransition(from, to))
                    return BadRequest(new ApiResponse<ComplaintDetailDto> { Success = false, Message = "Invalid transition for handler." });

                if (to == ComplaintStatus.Done && from == ComplaintStatus.InProgress)
                {
                    // Completion attachments are mandatory for Mark Done.
                    // New flow uploads one or more completion photos via `/completion-photo` before patching status.
                    var completionUrls = ParseUrls(c.CompletionImageUrlsJson) ?? new List<string>();
                    var hasCompletionUploads = completionUrls.Count > 0 || !string.IsNullOrWhiteSpace(c.CompletionPhotoUrl);
                    if (!hasCompletionUploads)
                    {
                        // Legacy fallback: allow passing URL in request, but still store it as the first completion photo.
                        if (string.IsNullOrWhiteSpace(request.CompletionPhotoUrl))
                        {
                            return BadRequest(new ApiResponse<ComplaintDetailDto>
                            {
                                Success = false,
                                Message = "Completion photo is required when marking work as done."
                            });
                        }
                        c.CompletionPhotoUrl = request.CompletionPhotoUrl.Trim();
                        completionUrls.Add(c.CompletionPhotoUrl);
                        c.CompletionImageUrlsJson = SerializeUrls(completionUrls);
                    }
                }

                // Cleanup active completion data when moving away from 'Done'
                if (from == ComplaintStatus.Done && to != ComplaintStatus.Done)
                {
                    c.CompletionPhotoUrl = null;
                    c.CompletionImageUrlsJson = null;
                }

                c.Status = to;
                c.UpdatedAt = DateTime.Now;

                // Snapshot attachments onto the timeline log so each completion stage
                // remains visible even if the ticket is reopened later.
                string? attachmentUrlsJson = null;
                if (to == ComplaintStatus.Done && from == ComplaintStatus.InProgress)
                {
                    var completionUrls = ParseUrls(c.CompletionImageUrlsJson) ?? new List<string>();
                    if (!string.IsNullOrWhiteSpace(c.CompletionPhotoUrl) && !completionUrls.Contains(c.CompletionPhotoUrl))
                        completionUrls.Add(c.CompletionPhotoUrl);
                    attachmentUrlsJson = SerializeUrls(completionUrls);
                }

                _context.ComplaintLogs.Add(new ComplaintLog
                {
                    ComplaintId = c.Id,
                    UserId = CurrentUserId,
                    Message = string.IsNullOrWhiteSpace(request.Message) ? $"Status → {to}" : request.Message!.Trim(),
                    FromStatus = from,
                    ToStatus = to,
                    AttachmentUrlsJson = attachmentUrlsJson,
                    CreatedAt = DateTime.Now
                });
                await _context.SaveChangesAsync();
                return await GetById(id);
            }

            return Forbidden();
        }
    }
}
