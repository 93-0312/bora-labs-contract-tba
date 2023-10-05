// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.3)

pragma solidity 0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./common/BoralabsBase.sol";

contract BoralabsTBA1155 is BoralabsBase, ERC1155Supply, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.UintSet;
    using Strings for uint256;

    mapping(address => EnumerableSet.UintSet) private _tokenIds; // Store list token id of account
    string public contractURI = ""; // Contract URI for Contract Information

    constructor(string memory baseURI_, string memory contractURI_) ERC1155(baseURI_) {
        contractURI = contractURI_;
    }

    // =========================================================================================== //
    // MINT
    // =========================================================================================== //
    /**
     * @notice Mint token for account
     * @param to account receive token
     * @param id token id
     * @param amount amount to mint
     * @param data additional data
     */
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external nonReentrant onlyOwner { // nonReentrant >> 무슨 역할인지 확인 : 여러번 호출 하는 것을 방지
        super._mint(to, id, amount, data);
    }

    // =========================================================================================== //
    // BURN
    // =========================================================================================== //
    /**
     * @notice Burn token of sender
     * @dev only for owner role
     * @param id token id
     * @param amount amount to burn
     */
    function burn(uint256 id, uint256 amount) external onlyApprovedOrOwner(_msgSender()) {
        super._burn(_msgSender(), id, amount);
    }

    // =========================================================================================== //
    // TRANSFER COMMON..( mint , burn, transfer )
    // =========================================================================================== //
    /**
     * @dev Override _afterTokenTransfer of ERC1155
     * @dev Process to manage list token ids by account
     */
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        super._afterTokenTransfer(operator, from, to, ids, amounts, data);

        // Update list of token IDs for 'from' and 'to' address
        for (uint256 i = 0; i < ids.length; ++i) {
            if (from != address(0)) {
                _updateTokenIds(from, ids[i]);
            }
            if (to != address(0)) {
                _updateTokenIds(to, ids[i]);
            }
        }
    }

    // =========================================================================================== //
    // URI
    // =========================================================================================== //
    /**
     * @notice Get token uri by token id
     * @param id token ID
     * @return token URI
     */
    function uri(uint256 id) public view virtual override returns (string memory) {
        string memory baseURI = getBaseURI();

        return string(abi.encodePacked(baseURI, Strings.toString(id)));
    }

    /**
     * @notice Get base URI
     * @return base URI
     */
    function getBaseURI() public view returns (string memory) {
        return super.uri(0);
    }

    // =========================================================================================== //
    // OWNER
    // =========================================================================================== //
    /**
     * @notice Get tokens of owner
     * @param owner who owns the token
     * @return tokenIds_ list of token IDs
     * @return balances_ list of token amounts
     */
    function tokensOf(
        address owner
    ) external view returns (uint256[] memory tokenIds_, uint256[] memory balances_) {
        uint256 assetCount = _tokenIds[owner].length();

        uint256[] memory tokenIds = new uint256[](assetCount);  // assetCount >> length 확인
        uint256[] memory balances = new uint256[](assetCount);

        for (uint256 i = 0; i < assetCount; ++i) {
            uint256 tokenId = _tokenIds[owner].at(i);
            tokenIds[i] = tokenId;
            balances[i] = balanceOf(owner, tokenId);
        }

        tokenIds_ = tokenIds;
        balances_ = balances;
    }

    /**
     * @notice Get number of token IDs of owner
     * @param owner who owns the token
     * @return number of token IDs
     */
    function tokenCountOf(address owner) external view returns (uint256) {
        return _tokenIds[owner].length();
    }

    /**
     * @notice update list token ids of account
     * @param account account to update token ids
     * @param tokenId token id to update
     */
    function _updateTokenIds(address account, uint256 tokenId) private {
        uint256 balance = balanceOf(account, tokenId);

        if (balance > 0) {
            _tokenIds[account].add(tokenId);        // EnumerableSet -> add -> _add에서 _contains 확인
        } else {
            _tokenIds[account].remove(tokenId);
        }
    }

    // =========================================================================================== //
    // MODIFIER
    // =========================================================================================== //
    modifier onlyApprovedOrOwner(address from) {
        require(isApprovedForAll(from, _msgSender()), "Caller is not token owner or approved");
        _;
    }
}
