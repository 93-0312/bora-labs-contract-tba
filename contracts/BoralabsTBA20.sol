// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.3)

pragma solidity 0.8.19;

import "./common/BoralabsBase.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BoralabsTBA20 is BoralabsBase, ERC20, ReentrancyGuard {

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
    }

    // =========================================================================================== //
    // TRANSFER
    // =========================================================================================== //

    // =========================================================================================== //
    // MINT
    // =========================================================================================== //
    function mint(
        address to,
        uint256 amount
    ) public onlyOwner {
        _mint(to, amount);
    }

    function _mint(
        address account,
        uint256 amount
    ) internal virtual override nonReentrant {
        super._mint(account, amount);
        emit SupplyChanged(_msgSender(), "MINT", account, amount, totalSupply());
    }

    // =========================================================================================== //
    // BURN
    // =========================================================================================== //
    // _우리가 추가한 SupplyChanged 이벤트를 같이 해주기 위해서
    // ERC20Bunable 을 extends 하면 ERC20Bunable.burn 은 Bora20v2._burn 를 호출하는 것이 아니라 ERC20._burn 을 호출한다.
    // 따라서 burn, burnFrom 을 여기에서 직접 구현을 했다...
    function burn(
        uint256 amount
    ) public {
        _burn(_msgSender(), amount);
    }

    function burnFrom(
        address account,
        uint256 amount
    ) public {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }

    function _burn(
        address account,
        uint256 amount
    ) internal virtual override onlyOwner {
        super._burn(account, amount);
        emit SupplyChanged(_msgSender(), "BURN", account, amount, totalSupply());
    }

    event SupplyChanged(
        address indexed operator,
        string indexed cmdType,
        address indexed to,
        uint256 amount,
        uint256 afterTotalSupply
    );
}
