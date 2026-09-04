using backend.Dtos;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly TokenService _tokens;

    public AuthController(UserManager<ApplicationUser> users, TokenService tokens)
    {
        _users = users;
        _tokens = tokens;
    }

    [HttpPost("register/training-center")]
    public async Task<IActionResult> RegisterTrainingCenter(RegisterTrainingCenterDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            Role = UserRole.TrainingCenter,
            DisplayName = dto.Name,
            TrainingCenterProfile = new TrainingCenterProfile
            {
                Name = dto.Name,
                Description = dto.Description,
                City = dto.City,
                Phone = dto.Phone
            }
        };

        var result = await _users.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(Respond(user));
    }

    [HttpPost("register/doctor")]
    public async Task<IActionResult> RegisterDoctor(RegisterDoctorDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            Role = UserRole.Doctor,
            DisplayName = $"{dto.FirstName} {dto.LastName}".Trim(),
            DoctorProfile = new DoctorProfile
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Specialty = dto.Specialty,
                City = dto.City,
                Phone = dto.Phone
            }
        };

        var result = await _users.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(Respond(user));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email);
        if (user is null || !await _users.CheckPasswordAsync(user, dto.Password))
            return Unauthorized("Invalid email or password");

        return Ok(Respond(user));
    }

    private AuthResponseDto Respond(ApplicationUser user) =>
        new(_tokens.CreateToken(user), user.Id, user.DisplayName, user.Role.ToString());
}
