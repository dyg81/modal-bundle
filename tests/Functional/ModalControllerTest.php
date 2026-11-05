<?php

namespace Dyg81\ModalBundle\Tests\Functional;

use Dyg81\ModalBundle\Tests\Fixtures\app\AppKernel;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ModalControllerTest extends WebTestCase
{
    protected static function getKernelClass()
    {
        return AppKernel::class;
    }

    public function testOpenMessageModalReturnsModalBody()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open/hello-world');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('.modal');
        $this->assertSelectorTextContains('.modal-body', 'hello-world');
    }

    public function testOpenConfirmModalReturnsModal()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/confirm');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('.modal');
    }

    public function testMessageModalRejectsPost()
    {
        $client = static::createClient();
        $client->request('POST', '/modal/open/hello-world');

        $this->assertResponseStatusCodeSame(405);
    }
}
