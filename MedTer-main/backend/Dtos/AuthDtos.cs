namespace backend.Dtos;

public record RegisterTrainingCenterDto(
    string Email,
    string Password,
    string Name,
    string? Description,
    string? City,
    string? Phone);

public record RegisterDoctorDto(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? Specialty,
    string? City,
    string? Phone);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(string Token, string UserId, string DisplayName, string Role);
