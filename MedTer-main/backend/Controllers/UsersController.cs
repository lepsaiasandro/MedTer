using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    // Returns users of the opposite role (who you can chat with)
    [HttpGet]
    public async Task<IActionResult> GetContacts()
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var myRole = Enum.Parse<UserRole>(User.FindFirstValue(ClaimTypes.Role)!);
        var otherRole = myRole == UserRole.Doctor ? UserRole.TrainingCenter : UserRole.Doctor;

        var users = await _db.Users
            .Where(u => u.Role == otherRole && u.Id != myId)
            .Select(u => new UserListItemDto(
                u.Id,
                u.DisplayName,
                u.Role.ToString(),
                u.Role == UserRole.Doctor ? u.DoctorProfile!.City : u.TrainingCenterProfile!.City))
            .ToListAsync();

        return Ok(users);
    }
}
