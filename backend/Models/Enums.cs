namespace net_backend.Models
{
    public enum Role
    {
        USER = 0,
        COORDINATOR = 1,
        HANDLER = 2,
        ADMIN = 3
    }

    public enum ComplaintStatus
    {
        Open = 0,
        Assigned = 1,
        Accepted = 2,
        InProgress = 3,
        Done = 4,
        Closed = 5
    }

    public enum ComplaintPriority
    {
        Low = 0,
        Medium = 1,
        High = 2,
        Critical = 3
    }
}
